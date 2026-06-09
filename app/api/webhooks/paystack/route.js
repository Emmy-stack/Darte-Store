import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request) {
    try {
        const signature = request.headers.get("x-paystack-signature");
        const isMockMode = !process.env.PAYSTACK_SECRET_KEY || 
            process.env.PAYSTACK_SECRET_KEY === "mock" || 
            process.env.PAYSTACK_SECRET_KEY.startsWith("mock");

        let bodyText = "";
        let body = {};

        if (!isMockMode) {
            if (!signature) {
                console.error("Missing x-paystack-signature header");
                return NextResponse.json({ error: "Missing signature" }, { status: 400 });
            }
            bodyText = await request.text();
            const hash = crypto
                .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
                .update(bodyText)
                .digest("hex");

            if (hash !== signature) {
                console.error("Paystack webhook signature verification failed");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
            body = JSON.parse(bodyText);
        } else {
            // In test/mock mode, read directly (supports mock payloads for testing)
            try {
                bodyText = await request.text();
                body = JSON.parse(bodyText);
            } catch (e) {
                body = {};
            }
            console.log("Mock Mode webhook received:", body);
        }

        const { event, data } = body;

        if (!event || !data) {
            return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
        }

        console.log(`Paystack webhook event received: ${event}`, data);

        if (event === "charge.success" && data.status === "success") {
            const transactionId = data.id;
            const tx_ref = data.reference;

            // Idempotent Transaction updates
            const dbTransaction = await prisma.transaction.findUnique({
                where: { txRef: tx_ref }
            });

            if (dbTransaction && dbTransaction.status !== "successful") {
                // Update transaction record
                await prisma.transaction.update({
                    where: { txRef: tx_ref },
                    data: {
                        status: "successful",
                        transactionId: String(transactionId)
                    }
                });

                // Get orderIds from database record
                const orderIds = dbTransaction.orderIds ? dbTransaction.orderIds.split(",") : [];

                if (orderIds.length > 0) {
                    // Update all associated orders to paid and status: paid_pending_confirmation
                    await prisma.order.updateMany({
                        where: {
                            id: { in: orderIds },
                        },
                        data: {
                            isPaid: true,
                            status: "paid_pending_confirmation"
                        },
                    });

                    // Payouts will be triggered manually after buyer confirmation
                }
            }
        } else if (event === "transfer.success" || event === "transfer.failed" || event === "transfer.reversed") {
            const transferId = data.id || data.transfer_code;
            const reference = data.reference;

            console.log(`Paystack transfer webhook received for reference: ${reference}, event: ${event}, status: ${data.status}`);

            if (!reference) {
                console.warn("Webhook warning: Missing reference in transfer event");
                return NextResponse.json({ received: true });
            }

            let dbStatus = "pending";
            if (event === "transfer.success") {
                dbStatus = "successful";
            } else if (event === "transfer.failed" || event === "transfer.reversed") {
                dbStatus = "failed";
            }

            // Update SellerTransfer record in the database
            try {
                await prisma.sellerTransfer.update({
                    where: { reference },
                    data: {
                        status: dbStatus,
                        transferId: String(transferId)
                    }
                });
                console.log(`Seller payout transfer for reference ${reference} updated to ${dbStatus} via verified webhook.`);
            } catch (dbError) {
                console.error(`Error updating SellerTransfer in DB for reference ${reference}:`, dbError);
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error("Error processing Paystack webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
