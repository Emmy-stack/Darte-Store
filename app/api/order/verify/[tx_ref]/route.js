import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerSellerPayout } from "@/lib/payout";

export async function GET(request, context) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const transaction_id = searchParams.get("transaction_id");

        const params = await context.params;
        const tx_ref = params.tx_ref;

        if (status !== "successful" || !transaction_id) {
            console.warn("Payment was cancelled or unsuccessful:", status);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
        }

        // Call Flutterwave to verify the transaction
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const flwData = await response.json();

        if (!response.ok || flwData.status !== "success" || flwData.data.status !== "successful") {
            console.error("Flutterwave verification failed:", flwData);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
        }

        // Verify tx_ref and amount match
        if (flwData.data.tx_ref !== tx_ref) {
            console.error("Reference mismatch:", flwData.data.tx_ref, tx_ref);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
        }

        // Check if transaction has already been processed successfully (idempotency check)
        const dbTransaction = await prisma.transaction.findUnique({
            where: { txRef: tx_ref }
        });

        if (dbTransaction && dbTransaction.status !== "successful") {
            // Update Transaction in DB
            await prisma.transaction.update({
                where: { txRef: tx_ref },
                data: {
                    status: "successful",
                    transactionId: String(transaction_id)
                }
            });

            // Get orderIds from database record
            const orderIds = dbTransaction.orderIds ? dbTransaction.orderIds.split(",") : [];

            if (orderIds.length > 0) {
                // Update orders to isPaid: true
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

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=success`);

    } catch (error) {
        console.error("Error verifying Flutterwave payment redirect:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
    }
}
