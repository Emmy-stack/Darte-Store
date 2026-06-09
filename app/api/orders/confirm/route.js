import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerSellerPayout } from "@/lib/payout";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        // Validate that order belongs to the authenticated user
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.userId !== userId) {
            return NextResponse.json({ error: "Forbidden: You do not own this order" }, { status: 403 });
        }

        if (!order.isPaid) {
            return NextResponse.json({ error: "Payment has not been verified for this order" }, { status: 400 });
        }

        if (order.status === "completed") {
            return NextResponse.json({ message: "Order is already completed", order });
        }

        const allowedStatuses = ["paid_pending_confirmation", "PROCESSING", "SHIPPED", "DELIVERED"];
        if (!allowedStatuses.includes(order.status)) {
            return NextResponse.json({ 
                error: `Order cannot be confirmed. Current status is '${order.status}', but must be one of: ${allowedStatuses.join(', ')}` 
            }, { status: 400 });
        }

        // Update status to completed
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: "completed" }
        });

        console.log(`[ESCROW CONFIRM] Order ${orderId} confirmed as received by Buyer ${userId}. Releasing seller payout...`);

        // Trigger payout distribution
        await triggerSellerPayout(orderId);

        return NextResponse.json({
            message: "Order successfully confirmed. Payout has been released.",
            order: updatedOrder
        });

    } catch (error) {
        console.error("Error confirming order delivery:", error);
        return NextResponse.json(
            { error: error.message || "Failed to confirm order" },
            { status: 500 }
        );
    }
}
