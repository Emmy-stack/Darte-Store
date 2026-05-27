import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const signature = request.headers.get("verif-hash");
        const secretHash = process.env.FLW_SECRET_HASH;

        // Verify webhook signature hash
        if (!secretHash || signature !== secretHash) {
            console.error("Invalid or missing Flutterwave webhook signature hash");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { event, data } = body;

        console.log(`Flutterwave webhook event received: ${event}`, data);

        if (event === "charge.completed" && data.status === "successful") {
            const transactionId = data.id;
            const tx_ref = data.tx_ref;

            // Query Flutterwave verification API to confirm (Double-verification check)
            const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || verifyData.status !== "success" || verifyData.data.status !== "successful") {
                console.error("Webhook double-verification check failed:", verifyData);
                return NextResponse.json({ error: "Verification check failed" }, { status: 400 });
            }

            // Verify tx_ref matches
            if (verifyData.data.tx_ref !== tx_ref) {
                console.error("Webhook reference mismatch:", verifyData.data.tx_ref, tx_ref);
                return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
            }

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
                    // Update all associated orders to paid
                    await prisma.order.updateMany({
                        where: {
                            id: { in: orderIds },
                        },
                        data: {
                            isPaid: true,
                        },
                    });

                    // Payouts will be triggered manually after buyer confirmation
                }
            }
        } else if (event === "transfer.completed" || event === "transfer.disburse") {
            const transferId = data.id;
            const reference = data.reference;

            console.log(`Flutterwave transfer webhook received for reference: ${reference}, event: ${event}, status: ${data.status}`);

            if (!reference) {
                console.warn("Webhook warning: Missing reference in transfer event");
                return NextResponse.json({ received: true });
            }

            // Query Flutterwave transfer endpoint to confirm (double-verification check)
            const verifyRes = await fetch(`https://api.flutterwave.com/v3/transfers/${transferId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || verifyData.status !== "success" || !verifyData.data) {
                console.error("Webhook transfer verification check failed:", verifyData);
                return NextResponse.json({ error: "Transfer verification check failed" }, { status: 400 });
            }

            const verifiedStatus = verifyData.data.status;
            let dbStatus = "pending";
            if (verifiedStatus === "SUCCESSFUL") {
                dbStatus = "successful";
            } else if (verifiedStatus === "FAILED") {
                dbStatus = "failed";
            }

            // Update SellerTransfer record in the database
            try {
                await prisma.sellerTransfer.update({
                    where: { reference },
                    data: {
                        status: dbStatus,
                        transferId: transferId
                    }
                });
                console.log(`Seller payout transfer for reference ${reference} updated to ${dbStatus} via verified webhook.`);
            } catch (dbError) {
                console.error(`Error updating SellerTransfer in DB for reference ${reference}:`, dbError);
                // Even if the transfer record was not found in DB, return 200 OK so FLW stops retrying
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error("Error processing Flutterwave webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
