import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { triggerSellerPayout } from "@/lib/payout";
import { sendDeliveryDenialEmail } from "@/lib/email";

export async function PATCH(request, context) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await context.params;
        const orderId = params.orderId;
        const { action } = await request.json(); // "confirm" or "deny"

        // Fetch order and ensure it belongs to the current user and status is DELIVERED
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
                store: true,
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.status !== "DELIVERED") {
            return NextResponse.json({ error: "Order is not in delivered status" }, { status: 400 });
        }

        if (action === "confirm") {
            // Update status to DELIVERY_CONFIRMED
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "DELIVERY_CONFIRMED" },
            });

            // Trigger Flutterwave automatic transfer to seller
            await triggerSellerPayout(orderId);

            return NextResponse.json({ message: "Delivery confirmed and payment released", order: updatedOrder });
        } else if (action === "deny") {
            // Update status to DELIVERY_DENIED
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "DELIVERY_DENIED" },
            });

            // Send dispute email to admin and seller
            await sendDeliveryDenialEmail(updatedOrder);

            return NextResponse.json({ message: "Delivery denied. Support has been notified", order: updatedOrder });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error processing delivery response:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
