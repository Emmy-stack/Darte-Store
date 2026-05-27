import prisma from "@/lib/prisma";
import { getSellerShareAmount, normalizePercentageSplitValue } from "@/lib/splitUtils";

function getRecipientName(fullName = "") {
    const nameParts = String(fullName).trim().split(/\s+/).filter(Boolean);
    return {
        first: nameParts[0] || "Seller",
        last: nameParts.slice(1).join(" ") || "",
    };
}

export async function triggerSellerPayout(orderId) {
    try {
        // Find the order and ensure it is paid.
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

        if (order.payoutTransfer && (order.payoutTransfer.status === "successful" || order.payoutTransfer.status === "pending")) {
            console.log(`Payout warning: Payout for Order ${orderId} already initiated or completed.`);
            return;
        }

        const store = await prisma.store.findUnique({
            where: { id: order.storeId },
            include: { payoutAccount: true }
        });

        if (!store || !store.payoutAccount) {
            console.error(`Payout error: Store or payout account missing for Store ${order.storeId}`);
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
        const { bankCode, accountNumber, accountName, bankName } = payoutAccount;

        if (!bankCode || !accountNumber || !accountName) {
            console.error(`Payout error: Incomplete payout details for Store ${store.id}`);
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

        const splitType = payoutAccount?.splitType || "percentage";
        const splitValue = typeof payoutAccount?.splitValue === "number" ? payoutAccount.splitValue : 98;
        const normalizedSplitValue = splitType === "percentage" ? normalizePercentageSplitValue(splitValue) : splitValue;
        const sellerAmount = Math.round(getSellerShareAmount(splitType, normalizedSplitValue, order.total) * 100) / 100;

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
            const existing = await prisma.sellerTransfer.findUnique({ where: { orderId } });
            if (existing) {
                if (existing.status === "successful" || existing.status === "pending") {
                    console.log(`Payout warning: Payout for Order ${orderId} already initiated or completed (DB status: ${existing.status}).`);
                    return;
                }
                transferRecord = await prisma.sellerTransfer.update({
                    where: { orderId },
                    data: { status: "pending", amount: sellerAmount }
                });
            } else {
                throw error;
            }
        }

        const isMockMode = !process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");
        if (isMockMode) {
            console.log(`[MOCK MODE] Direct transfer simulated for Order ${orderId}.`);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: {
                    status: "successful",
                    transferId: `MOCK_${Math.random().toString(36).slice(2, 10).toUpperCase()}`
                }
            });
            return;
        }

        const recipientName = getRecipientName(accountName || store.name);
        const transferPayload = {
            action: "instant",
            type: "bank",
            reference: orderId,
            narration: `Seller payout for order ${orderId}`,
            payment_instruction: {
                amount: {
                    value: sellerAmount,
                    applies_to: "destination_currency"
                },
                source_currency: "NGN",
                destination_currency: "NGN",
                recipient: {
                    bank: {
                        account_number: accountNumber,
                        code: bankCode,
                        name: bankName || payoutAccount.accountName,
                    },
                    name: recipientName,
                    email: store.email || undefined,
                }
            }
        };

        let response, flwData;
        try {
            response = await fetch("https://api.flutterwave.com/direct-transfers", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(transferPayload)
            });

            flwData = await response.json();
        } catch (fetchError) {
            console.error("Flutterwave direct transfer request failed:", fetchError);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: { status: "failed" }
            });
            return;
        }

        if (!response.ok || flwData.status !== "success" || !flwData.data) {
            console.error(`Direct transfer initiation failed for Order ${orderId}:`, flwData);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: { status: "failed" }
            });
            return;
        }

        const transferId = flwData.data.id || flwData.data.reference;
        const flwStatus = String(flwData.data.status || "NEW").toUpperCase();
        const payoutStatus = flwStatus === "SUCCESSFUL" ? "successful" : flwStatus === "FAILED" ? "failed" : "pending";

        await prisma.sellerTransfer.update({
            where: { orderId },
            data: {
                status: payoutStatus,
                transferId: transferId || orderId,
            }
        });

        console.log(`Direct bank transfer initiated for order ${orderId} (${transferId}), status: ${payoutStatus}`);
    } catch (error) {
        console.error(`Error executing payout for order ${orderId}:`, error);
    }
}
