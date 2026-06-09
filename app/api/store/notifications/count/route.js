import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ count: 0 });
        }

        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ count: 0 });
        }

        const sellerUser = await prisma.user.findUnique({ where: { id: userId } });
        const lastSeenAt = sellerUser?.lastSeenNotificationsAt || null;

        // Count of orders needing attention
        const count = await prisma.order.count({
            where: {
                storeId,
                OR: [
                    {
                        paymentMethod: "PAYSTACK",
                        isPaid: true,
                        status: "paid_pending_confirmation"
                    },
                    {
                        paymentMethod: "COD",
                        status: "ORDER_PLACED"
                    },
                    {
                        isPaid: true,
                        status: "ORDER_PLACED"
                    }
                ],
                ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Error fetching notification count:", error);
        return NextResponse.json({ count: 0 });
    }
}
