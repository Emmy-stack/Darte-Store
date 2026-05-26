import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const tx_ref = searchParams.get("tx_ref");
        const transaction_id = searchParams.get("transaction_id");

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

        // Verify tx_ref matches
        if (flwData.data.tx_ref !== tx_ref) {
            console.error("Reference mismatch:", flwData.data.tx_ref, tx_ref);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
        }

        // Process the orders
        if (tx_ref && tx_ref.startsWith("flw_orders_")) {
            const orderIds = tx_ref.replace("flw_orders_", "").split("_");

            // Update all matching orders as paid
            await prisma.order.updateMany({
                where: {
                    id: { in: orderIds },
                },
                data: {
                    isPaid: true,
                },
            });
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=success`);

    } catch (error) {
        console.error("Error verifying Flutterwave payment:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/orders?payment=failed`);
    }
}
