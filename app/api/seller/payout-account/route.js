import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where: { userId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        const payoutAccount = await prisma.sellerPayoutAccount.findUnique({
            where: {
                storeId: store.id,
            },
        });

        return NextResponse.json({ payoutAccount });
    } catch (error) {
        console.error("Error fetching payout account:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
