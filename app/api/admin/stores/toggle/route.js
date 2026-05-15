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
        const { storeId, isActive } = body;

        if (!storeId || typeof isActive !== 'boolean') {
            return NextResponse.json({ error: "storeId and boolean isActive are required" }, { status: 400 });
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                isActive: isActive
            }
        });

        return NextResponse.json({ message: `Store is now ${isActive ? 'active' : 'inactive'}`, store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
