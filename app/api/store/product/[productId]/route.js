import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request, { params }) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
    return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 400 });
  }
}
