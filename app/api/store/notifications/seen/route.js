import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { lastSeenNotificationsAt: new Date() },
        });

        return NextResponse.json({ message: "Seller notifications marked as seen" });
    } catch (error) {
        console.error("Error marking seller notifications as seen:", error);
        return NextResponse.json(
            { error: error.message || "Failed to mark notifications as seen" },
            { status: 500 }
        );
    }
}
