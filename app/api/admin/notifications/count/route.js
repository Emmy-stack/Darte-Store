import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const adminUser = await prisma.user.findUnique({ where: { id: userId } });
        const lastSeenAt = adminUser?.lastSeenNotificationsAt || null;

        const pendingStoreCount = await prisma.store.count({
            where: {
                status: "pending",
                ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
            }
        });

        const pendingVerificationCount = await prisma.store.count({
            where: {
                verificationStatus: "pending",
                ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
            }
        });

        const reportCount = await prisma.storeReport.count({
            where: {
                status: "pending",
                ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
            }
        });

        const newOrderCount = await prisma.order.count({
            where: {
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

        const total = pendingStoreCount + pendingVerificationCount + reportCount + newOrderCount;

        return NextResponse.json({
            total,
            pendingStoreCount,
            pendingVerificationCount,
            reportCount,
            newOrderCount,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Failed to fetch notification counts" }, { status: 400 });
    }
}
