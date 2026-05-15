import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const { code } = params;

        if (!code) {
            return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
        }

        await prisma.coupon.delete({
            where: {
                code: code
            }
        });

        return NextResponse.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Delete coupon error:", error);
        // Prisma throws specific code if record to delete does not exist
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
