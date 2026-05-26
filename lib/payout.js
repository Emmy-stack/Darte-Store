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

        const payoutAccount = store.payoutAccount;
        let subaccountId = payoutAccount.subaccountId;

        // Auto-register subaccount on-the-fly if missing but bank details exist (backward compatibility)
        if (!subaccountId && payoutAccount.bankCode && payoutAccount.accountNumber) {
            console.log(`On-the-fly subaccount registration on payout for Store ${store.id}`);
            try {
                const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");
                const { getFlutterwaveSplitValue } = await import("@/lib/splitUtils");
                const defaultSplitValue = 98;
                const splitType = payoutAccount.splitType || "percentage";
                const splitValue = typeof payoutAccount.splitValue === "number" ? payoutAccount.splitValue : defaultSplitValue;
                const normalizedSplit = splitType === "percentage" ? normalizePercentageSplitValue(splitValue) : splitValue;
                const flwSplitValue = getFlutterwaveSplitValue(splitType, normalizedSplit);

                const subRes = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        account_bank: payoutAccount.bankCode,
                        account_number: payoutAccount.accountNumber,
                        business_name: store.name,
                        business_email: store.email,
                        business_contact: store.name,
                        business_mobile: store.contact,
                        country: "NG",
                        currency: "NGN",
                        split_type: splitType,
                        split_value: flwSplitValue,
                    }),
                });

                const subData = await subRes.json();
                if (subRes.ok && subData.status === "success") {
                    subaccountId = subData.data.subaccount_id || subData.data.id;
                    await prisma.sellerPayoutAccount.update({
                        where: { id: payoutAccount.id },
                        data: { subaccountId }
                    });
                    console.log(`Registered subaccount ${subaccountId} for store ${store.id} during payout`);
                } else if (isTestMode) {
                    subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    await prisma.sellerPayoutAccount.update({
                        where: { id: payoutAccount.id },
                        data: { subaccountId }
                    });
                    console.log(`Registered mock subaccount ${subaccountId} for store ${store.id} during payout`);
                }
            } catch (err) {
                console.error("Failed to register subaccount during payout:", err);
            }
        }

        const { bankCode, accountNumber } = payoutAccount;

        // Calculate seller share using payout account split settings (default 99%)
        const defaultSplitValue = 98;
        const splitType = payoutAccount?.splitType || "percentage";
        const splitValue = typeof payoutAccount?.splitValue === "number" ? payoutAccount.splitValue : defaultSplitValue;

        // Normalize percentage values so 0.99 is treated as 99% instead of 0.99%
        const normalizedSplitValue = splitType === "percentage" ? normalizePercentageSplitValue(splitValue) : splitValue;
        let sellerAmount = getSellerShareAmount(splitType, normalizedSplitValue, order.total);
        sellerAmount = Math.round(sellerAmount * 100) / 100;

        // Fetch transaction associated with this order to retrieve the Flutterwave transactionId
        const dbTransaction = await prisma.transaction.findFirst({
            where: {
                orderIds: {
                    contains: orderId
                }
            }
        });

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

        // Call Flutterwave Escrow Settle API to release the escrowed split funds to subaccount
        const isTestMode = (process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-")) || !dbTransaction || !dbTransaction.transactionId;

        if (isTestMode) {
            console.log(`[TEST MODE] Escrow release triggered. Mocking successful release for Order ${orderId}.`);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: {
                    status: "successful",
                    transferId: Math.floor(100000 + Math.random() * 900000)
                }
            });
            console.log(`Mocked transfer set to successful for order ${orderId}`);
            return;
        }

        let response, flwData;
        let transferFailed = false;
        try {
            console.log(`Calling Flutterwave Escrow Settle API for Transaction ID: ${dbTransaction.transactionId}`);
            response = await fetch("https://api.ravepay.co/v2/gpx/transactions/escrow/settle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: dbTransaction.transactionId,
                    secret_key: process.env.FLUTTERWAVE_SECRET_KEY
                })
            });

            flwData = await response.json();
            if (!response.ok || flwData.status !== "success") {
                transferFailed = true;
            }
        } catch (fetchError) {
            console.error("Flutterwave Escrow Settle API fetch error:", fetchError);
            transferFailed = true;
            flwData = { status: "error", message: fetchError.message };
        }

        if (transferFailed) {
            console.error(`Flutterwave Escrow Settle failed for Order ${orderId}:`, flwData);

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

        // Update SellerTransfer record status to successful on escrow settlement success
        await prisma.sellerTransfer.update({
            where: { orderId },
            data: {
                status: "successful",
                transferId: parseInt(dbTransaction.transactionId, 10) || Math.floor(100000 + Math.random() * 900000)
            }
        });

        console.log(`Automated escrow settlement completed for order ${orderId} to store ${order.storeId}.`);

    } catch (error) {
        console.error(`Error executing payout for order ${orderId}:`, error);
    }
}
