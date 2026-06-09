import prisma from "@/lib/prisma";
import { getSellerShareAmount, normalizePercentageSplitValue } from "@/lib/splitUtils";

export async function triggerSellerPayout(orderId) {
    try {
        console.log(`[PAYOUT] Triggering payout for Order: ${orderId}`);

        // Find the order and ensure it is paid.
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { payoutTransfer: true }
        });

        if (!order) {
            console.error(`[PAYOUT ERROR] Order ${orderId} not found`);
            return;
        }

        if (!order.isPaid) {
            console.warn(`[PAYOUT WARNING] Order ${orderId} is not paid yet. Skipping.`);
            return;
        }

        if (order.status !== "completed") {
            console.warn(`[PAYOUT WARNING] Order ${orderId} status is not 'completed'. Escrow release requires buyer confirmation. Current status: ${order.status}. Skipping.`);
            return;
        }

        if (order.payoutTransfer && (order.payoutTransfer.status === "successful" || order.payoutTransfer.status === "pending")) {
            console.log(`[PAYOUT WARNING] Payout for Order ${orderId} already initiated or completed (Status: ${order.payoutTransfer.status}).`);
            return;
        }

        const store = await prisma.store.findUnique({
            where: { id: order.storeId },
            include: { payoutAccount: true }
        });

        if (!store || !store.payoutAccount) {
            console.error(`[PAYOUT ERROR] Store or payout account missing for Store ${order.storeId}`);
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
        let subaccountId = payoutAccount.subaccountId;

        if (!bankCode || !accountNumber || !accountName) {
            console.error(`[PAYOUT ERROR] Incomplete payout details for Store ${store.id}`);
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

        const isTestMode = !process.env.PAYSTACK_SECRET_KEY || 
            process.env.PAYSTACK_SECRET_KEY.includes("mock") || 
            process.env.PAYSTACK_SECRET_KEY.includes("test");

        // Sync missing recipient_code to Paystack automatically if not stored in DB
        if (!subaccountId) {
            console.log(`[PAYOUT] Store ${store.id} does not have a recipient_code (subaccountId) in DB. Creating one on the fly...`);
            if (!isTestMode) {
                try {
                    const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            type: "nuban",
                            name: accountName,
                            account_number: accountNumber,
                            bank_code: bankCode,
                            currency: "NGN",
                        }),
                    });

                    const recipientData = await recipientResponse.json();

                    if (!recipientResponse.ok || !recipientData.status) {
                        console.error(`[PAYOUT ERROR] Failed to create Paystack transfer recipient on the fly:`, recipientData);
                    } else {
                        subaccountId = recipientData.data.recipient_code;
                        // Save back to DB
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                        console.log(`[PAYOUT] Created and saved new recipient_code on the fly: ${subaccountId}`);
                    }
                } catch (recErr) {
                    console.error(`[PAYOUT ERROR] Exception creating transfer recipient:`, recErr);
                }
            } else {
                subaccountId = "RCP_" + Math.random().toString(36).substring(2, 12).toUpperCase();
                await prisma.sellerPayoutAccount.update({
                    where: { id: payoutAccount.id },
                    data: { subaccountId }
                });
                console.log(`[PAYOUT MOCK] Generated mock subaccountId: ${subaccountId}`);
            }
        }

        if (!subaccountId) {
            console.error(`[PAYOUT ERROR] Payout cancelled. No recipient_code could be resolved for Store ${store.id}`);
            return;
        }

        const splitType = payoutAccount.splitType || "percentage";
        const splitValue = typeof payoutAccount.splitValue === "number" ? payoutAccount.splitValue : 98;
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
                    console.log(`[PAYOUT WARNING] Payout for Order ${orderId} already in progress or completed (DB status: ${existing.status}).`);
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

        if (isTestMode) {
            console.log(`[PAYOUT MOCK] Simulating Paystack transfer for Order ${orderId} to ${subaccountId} with amount ${sellerAmount}`);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: {
                    status: "successful",
                    transferId: `MOCK_TRF_${Math.random().toString(36).slice(2, 10).toUpperCase()}`
                }
            });
            console.log(`[PAYOUT MOCK] Escrow transfer successful for Order ${orderId}.`);
            return;
        }

        let response, paystackData;
        try {
            const transferPayload = {
                source: "balance",
                amount: Math.round(sellerAmount * 100), // in kobo
                reference: orderId,
                recipient: subaccountId,
                reason: `Seller payout for order ${orderId}`
            };

            response = await fetch("https://api.paystack.co/transfer", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(transferPayload)
            });

            paystackData = await response.json();
        } catch (fetchError) {
            console.error("[PAYOUT ERROR] Paystack transfer request failed:", fetchError);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: { status: "failed" }
            });
            return;
        }

        if (!response.ok || !paystackData.status || !paystackData.data) {
            console.error(`[PAYOUT ERROR] Transfer initiation failed for Order ${orderId}:`, paystackData);
            await prisma.sellerTransfer.update({
                where: { orderId },
                data: { status: "failed" }
            });
            return;
        }

        const transferId = paystackData.data.transfer_code || paystackData.data.id;
        const paystackStatus = String(paystackData.data.status || "otp").toLowerCase();
        
        // Status mapping: Paystack has transfer status (success, failed, routing, and otp/pending)
        let payoutStatus = "pending";
        if (paystackStatus === "success") {
            payoutStatus = "successful";
        } else if (paystackStatus === "failed") {
            payoutStatus = "failed";
        }

        await prisma.sellerTransfer.update({
            where: { orderId },
            data: {
                status: payoutStatus,
                transferId: String(transferId || orderId),
            }
        });

        console.log(`[PAYOUT SUCCESS] Transfer initiated for order ${orderId} (${transferId}), status: ${payoutStatus}`);
    } catch (error) {
        console.error(`[PAYOUT ERROR] Error executing payout for order ${orderId}:`, error);
    }
}
