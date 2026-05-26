import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { storeId, reason } = await request.json();

        if (!storeId || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        // Check if user already reported this store
        const existingReport = await prisma.storeReport.findFirst({
            where: {
                storeId,
                reportedById: userId
            }
        });

        if (existingReport) {
            return NextResponse.json({ error: "You have already reported this store" }, { status: 400 });
        }

        // Create report
        const report = await prisma.storeReport.create({
            data: {
                storeId,
                reason,
                reportedById: userId,
                status: "pending"
            }
        });

        return NextResponse.json({ message: "Store reported successfully", report });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
