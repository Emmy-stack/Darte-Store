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

        // Fetch reset setting
        const settings = await prisma.adminSettings.findUnique({
            where: { id: "default" }
        });
        const resetAt = settings?.revenueOrdersResetAt || null;

        // Formulate order filtering criteria based on reset date
        const orderFilter = resetAt ? { createdAt: { gt: resetAt } } : {};

        // Fetch counts
        const productsCount = await prisma.product.count();
        const storesCount = await prisma.store.count();
        const ordersCount = await prisma.order.count({
            where: orderFilter
        });

        // Fetch revenue (sum of all filtered orders)
        const revenueAgg = await prisma.order.aggregate({
            _sum: { total: true },
            where: orderFilter
        });
        const revenue = revenueAgg._sum.total || 0;

        // Fetch all filtered orders for the area chart (timeline)
        const allOrders = await prisma.order.findMany({
            where: orderFilter,
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
            allOrders: allOrders,
            resetAt: resetAt
        };

        return NextResponse.json({ success: true, dashboardData });

    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId } = await auth();

        // Check if the user is an admin
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ success: false, message: "Not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body;

        let resetAt = null;

        if (action === "reset") {
            resetAt = new Date();
        } else if (action === "restore") {
            resetAt = null;
        } else {
            return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
        }

        await prisma.adminSettings.upsert({
            where: { id: "default" },
            update: {
                revenueOrdersResetAt: resetAt
            },
            create: {
                id: "default",
                revenueOrdersResetAt: resetAt
            }
        });

        return NextResponse.json({ 
            success: true, 
            resetAt, 
            message: action === "reset" ? "Dashboard counters reset to zero successfully!" : "Dashboard counters restored successfully!" 
        });

    } catch (error) {
        console.error("Error resetting dashboard metrics:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
