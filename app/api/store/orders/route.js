import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        // Fetch all orders for the seller with related data
        const orders = await prisma.order.findMany({
            where: { storeId },
            include: {
                user: true,
                address: true,
                orderItems: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform coupon data from JSON to object
        const formattedOrders = orders.map((order) => ({
            ...order,
            coupon: typeof order.coupon === "string" ? JSON.parse(order.coupon) : order.coupon,
        }));

        return NextResponse.json({ orders: formattedOrders });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch orders" },
            { status: 400 }
        );
    }
}
