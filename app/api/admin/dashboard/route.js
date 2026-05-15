import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const { userId } = await auth();

        // Check if the user is an admin
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: "Not authorized" }, { status: 401 });
        }

        // Fetch counts
        const productsCount = await prisma.product.count();
        const storesCount = await prisma.store.count();
        const ordersCount = await prisma.order.count();

        // Fetch revenue (sum of all orders)
        const revenueAgg = await prisma.order.aggregate({
            _sum: { total: true }
        });
        const revenue = revenueAgg._sum.total || 0;

        // Fetch all orders for the area chart (sorted by oldest to newest to form a timeline)
        const allOrders = await prisma.order.findMany({
            select: {
                createdAt: true,
                total: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const dashboardData = {
            products: productsCount,
            stores: storesCount,
            orders: ordersCount,
            revenue: revenue,
            allOrders: allOrders
        };

        return NextResponse.json({ success: true, dashboardData });

    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
