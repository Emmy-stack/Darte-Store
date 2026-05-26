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
        const { storeId } = body;

        if (!storeId) {
            return NextResponse.json({ error: "storeId is required" }, { status: 400 });
        }

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        await prisma.store.update({
            where: { id: storeId },
            data: {
                status: "deleted",
                isActive: false
            }
        });
        await prisma.user.update({ where: { id: store.userId }, data: { role: "user" } });

        return NextResponse.json({ message: "Seller removed successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
