import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { storeId, status } = body;

        if (!storeId || !status) {
            return NextResponse.json({ error: "storeId and status are required" }, { status: 400 });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: "invalid status" }, { status: 400 });
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                status: status,
                isActive: status === 'approved'
            }
        });

        return NextResponse.json({ message: `Store successfully ${status}`, store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
