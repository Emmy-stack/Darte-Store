import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, context) {
    try {
        const { searchParams } = new URL(request.url);
        const reference = searchParams.get("reference") || searchParams.get("trxref");

        const params = await context.params;
        const tx_ref = params.tx_ref;

        if (!reference && !tx_ref) {
            console.warn("Verification failed: Missing reference or tx_ref");
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
        }

        const actualRef = reference || tx_ref;

        const isTestMode = !process.env.PAYSTACK_SECRET_KEY || 
            process.env.PAYSTACK_SECRET_KEY.includes("mock") || 
            process.env.PAYSTACK_SECRET_KEY.includes("test");

        let transaction_id = reference || "MOCK_TX_" + Math.random().toString(36).substring(2, 10).toUpperCase();

        if (!isTestMode) {
            // Call Paystack to verify the transaction
            const response = await fetch(`https://api.paystack.co/transaction/verify/${actualRef}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const paystackData = await response.json();

            if (!response.ok || !paystackData.status || paystackData.data.status !== "success") {
                console.error("Paystack verification failed:", paystackData);
                return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
            }

            // Verify tx_ref matches metadata or reference
            if (paystackData.data.reference !== tx_ref && paystackData.data.reference !== actualRef) {
                console.error("Reference mismatch:", paystackData.data.reference, tx_ref);
                return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
            }

            transaction_id = String(paystackData.data.id);
        } else {
            console.log("Mock Mode: Simulating Paystack payment verification success for reference:", actualRef);
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
                // Update orders to isPaid: true and status: paid_pending_confirmation
                await prisma.order.updateMany({
                    where: {
                        id: { in: orderIds },
                    },
                    data: {
                        isPaid: true,
                        status: "paid_pending_confirmation"
                    },
                });

                // Payouts are triggered manually after buyer confirmation
            }
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=success`);

    } catch (error) {
        console.error("Error verifying Paystack payment redirect:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
    }
}
