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

        const { productId } = await params;
        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        try {
            await prisma.product.delete({ where: { id: productId } });
            return NextResponse.json({ message: "Product deleted successfully" });
        } catch (dbError) {
            if (dbError.code === "P2003") {
                await prisma.product.update({
                    where: { id: productId },
                    data: { inStock: false }
                });
                return NextResponse.json({
                    message: "Product is referenced in existing orders. It has been marked out of stock and hidden instead of deleted.",
                    softDeleted: true
                });
            }
            throw dbError;
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
