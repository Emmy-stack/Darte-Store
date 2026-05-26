import prisma from "@/lib/prisma";
import { getSellerShareAmount, normalizePercentageSplitValue } from "@/lib/splitUtils";

export async function triggerSellerPayout(orderId) {
    try {
        // Find the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { payoutTransfer: true }
        });

        if (!order) {
            console.error(`Payout error: Order ${orderId} not found`);
            return;
        }

        if (!order.isPaid) {
            console.warn(`Payout warning: Order ${orderId} is not paid yet. Skipping.`);
            return;
        }

        // Prevent double payout (idempotency check)
        if (order.payoutTransfer && (order.payoutTransfer.status === "successful" || order.payoutTransfer.status === "pending")) {
            console.log(`Payout warning: Payout for Order ${orderId} already initiated or completed.`);
            return;
        }

        // Fetch store and payout bank account
        const store = await prisma.store.findUnique({
            where: { id: order.storeId },
            include: { payoutAccount: true }
        });

        if (!store || !store.payoutAccount) {
            console.error(`Payout error: Store or Payout account not found for Store ${order.storeId}`);
            // Create a failed transfer record to track this manually
            await prisma.sellerTransfer.upsert({
                where: { orderId },
                update: { status: "failed" },
                create: {
                    orderId,
                    storeId: order.storeId,
                    amount: order.total,
                    currency: "NGN",
                    status: "failed",
                    reference: orderId
                }
            });
            return;
        }

        const { bankCode, accountNumber } = store.payoutAccount;

        // Calculate seller share using payout account split settings (default 99%)
        const payoutAccount = store.payoutAccount;
        const defaultSplitValue = 99;
        const splitType = payoutAccount?.splitType || "percentage";
        const splitValue = typeof payoutAccount?.splitValue === "number" ? payoutAccount.splitValue : defaultSplitValue;

        // Normalize percentage values so 0.99 is treated as 99% instead of 0.99%
        const normalizedSplitValue = splitType === "percentage" ? normalizePercentageSplitValue(splitValue) : splitValue;
        let sellerAmount = getSellerShareAmount(splitType, normalizedSplitValue, order.total);
        sellerAmount = Math.round(sellerAmount * 100) / 100;

        // Lock payout with a pending Transfer record (idempotency key is the reference: orderId)
        let transferRecord;
        try {
            transferRecord = await prisma.sellerTransfer.create({
                data: {
                    orderId,
                    storeId: order.storeId,
                    amount: sellerAmount,
                    currency: "NGN",
                    status: "pending",
                    reference: orderId
                }
            });
        } catch (error) {
            // Check if record already exists
            const existing = await prisma.sellerTransfer.findUnique({
                where: { orderId }
            });

            if (existing) {
                if (existing.status === "successful" || existing.status === "pending") {
                    console.log(`Payout warning: Payout for Order ${orderId} already initiated or completed (DB status: ${existing.status}).`);
                    return;
                }
                // If it is failed, we can update it to pending to retry and ensure amount matches
                transferRecord = await prisma.sellerTransfer.update({
                    where: { orderId },
                    data: { status: "pending", amount: sellerAmount }
                });
            } else {
                throw error;
            }
        }

        // Call Flutterwave Transfers API to send seller their share (e.g., 99%)
        const response = await fetch("https://api.flutterwave.com/v3/transfers", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                account_bank: bankCode,
                account_number: accountNumber,
                amount: sellerAmount,
                currency: "NGN",
                narration: `Payout (seller share) for Darte Order ${orderId}`,
                reference: orderId
            })
        });

        const flwData = await response.json();

        if (!response.ok || flwData.status !== "success") {
            // If the failure is due to duplicate reference, query the actual status
            if (flwData.message && (flwData.message.includes("already exists") || flwData.message.includes("duplicate"))) {
                console.log(`Flutterwave payout for Order ${orderId} already exists in Flutterwave. Fetching status...`);
                
                const fetchRes = await fetch(`https://api.flutterwave.com/v3/transfers?reference=${orderId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                        "Content-Type": "application/json"
                    }
                });

                const fetchData = await fetchRes.json();
                if (fetchRes.ok && fetchData.status === "success" && fetchData.data && fetchData.data.length > 0) {
                    const transfer = fetchData.data[0];
                    const flwStatus = transfer.status;
                    let dbStatus = "pending";
                    if (flwStatus === "SUCCESSFUL") {
                        dbStatus = "successful";
                    } else if (flwStatus === "FAILED") {
                        dbStatus = "failed";
                    }
                    await prisma.sellerTransfer.update({
                        where: { orderId },
                        data: {
                            status: dbStatus,
                            transferId: transfer.id
                        }
                    });
                    console.log(`Seller transfer for Order ${orderId} sync complete. Status: ${dbStatus}`);
                    return;
                }
            }

            console.error(`Flutterwave payout transfer failed for Order ${orderId}:`, flwData);
            
            // Only mark as failed if it's not already successful or pending in the DB (avoid overwriting success)
            const currentRecord = await prisma.sellerTransfer.findUnique({ where: { orderId } });
            if (currentRecord && currentRecord.status !== "successful" && currentRecord.status !== "pending") {
                await prisma.sellerTransfer.update({
                    where: { orderId },
                    data: { status: "failed" }
                });
            }
            return;
        }

        // Update SellerTransfer record status based on response status
        const flwStatus = flwData.data.status;
        let dbStatus = "pending";
        if (flwStatus === "SUCCESSFUL") {
            dbStatus = "successful";
        } else if (flwStatus === "FAILED") {
            dbStatus = "failed";
        }

        await prisma.sellerTransfer.update({
            where: { orderId },
            data: {
                status: dbStatus,
                transferId: flwData.data.id
            }
        });

        console.log(`Automated transfer initialized for order ${orderId} to store ${order.storeId}. Status: ${dbStatus}`);

    } catch (error) {
        console.error(`Error executing payout for order ${orderId}:`, error);
    }
}
