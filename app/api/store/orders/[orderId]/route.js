import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";
import { sendDeliveryNotificationEmail } from "@/lib/email";

export async function PATCH(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);
        const { orderId } = await params;
        const { status } = await request.json();

        // Verify the order belongs to this seller and is COD or paid
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                storeId,
                OR: [
                    { paymentMethod: "COD" },
                    { isPaid: true }
                ]
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: "Order not found or unauthorized" },
                { status: 404 }
            );
        }

        // Update order status
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: {
                user: true,
                address: true,
                orderItems: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        // Send delivery email notification to buyer if status is DELIVERED
        if (status === "DELIVERED" && updatedOrder.user?.email) {
            await sendDeliveryNotificationEmail(
                updatedOrder,
                updatedOrder.user.email,
                updatedOrder.user.name || "Customer"
            );
        }

        return NextResponse.json({
            message: "Order status updated successfully",
            order: updatedOrder,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message || "Failed to update order status" },
            { status: 400 }
        );
    }
}
