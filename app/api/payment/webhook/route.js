import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const signature = request.headers.get("verif-hash");
        const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

        // Verify the webhook signature if configured
        if (webhookHash && signature !== webhookHash) {
            console.error("Invalid Flutterwave webhook signature hash");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        console.log("Flutterwave Webhook received:", body);

        const { event, data } = body;

        if (event === "charge.completed" && data.status === "successful") {
            const transactionId = data.id;
            const tx_ref = data.tx_ref;

            // Double-verify with Flutterwave to prevent spoofing
            const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const flwData = await response.json();

            if (response.ok && flwData.status === "success" && flwData.data.status === "successful") {
                if (tx_ref && tx_ref.startsWith("flw_orders_")) {
                    const orderIds = tx_ref.replace("flw_orders_", "").split("_");

                    // Mark orders as paid
                    await prisma.order.updateMany({
                        where: {
                            id: { in: orderIds },
                            isPaid: false, // only update unpaid ones
                        },
                        data: {
                            isPaid: true,
                        },
                    });

                    console.log(`Orders [${orderIds.join(", ")}] marked as paid via webhook.`);
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Flutterwave Webhook error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
