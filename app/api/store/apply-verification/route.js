import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where: { userId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        if (store.verificationStatus === 'approved') {
            return NextResponse.json({ error: "Your store is already verified" }, { status: 400 });
        }

        if (store.verificationStatus === 'pending') {
            return NextResponse.json({ error: "Your verification application is already pending review" }, { status: 400 });
        }

        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: { verificationStatus: "pending" }
        });

        return NextResponse.json({ message: "Verification application submitted successfully", store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
