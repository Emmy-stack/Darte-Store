import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get all products from all active stores with ratings
export async function GET(request) {
    try {
        const products = await prisma.product.findMany({
            where: {
                inStock: true,
                store: {
                    isActive: true,
                },
            },
            include: {
                rating: {
                    select: {
                        id: true,
                        rating: true,
                        review: true,
                        userId: true,
                        createdAt: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        verificationStatus: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch products" },
            { status: 400 }
        );
    }
}
