import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

// GET /api/ratings
// Fetches all ratings left by the authenticated user
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ ratings: [] });
        }

        const ratings = await prisma.rating.findMany({
            where: { userId }
        });

        return NextResponse.json({ ratings });
    } catch (error) {
        console.error("Error fetching ratings:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch ratings" },
            { status: 500 }
        );
    }
}

// POST /api/ratings
// Creates a new product rating/review
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rating, review, productId, orderId } = await request.json();

        // Basic validations
        const numRating = parseInt(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
        }

        if (!productId || !orderId) {
            return NextResponse.json({ error: "Product ID and Order ID are required" }, { status: 400 });
        }

        // Verify the order exists and belongs to the user
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
        }

        // Check if user already rated this product for this order
        const existingRating = await prisma.rating.findUnique({
            where: {
                userId_productId_orderId: {
                    userId,
                    productId,
                    orderId
                }
            }
        });

        if (existingRating) {
            return NextResponse.json({ error: "You have already rated this product for this order" }, { status: 400 });
        }

        // Create the rating in the database
        const newRating = await prisma.rating.create({
            data: {
                rating: numRating,
                review: review || "",
                userId,
                productId,
                orderId
            }
        });

        return NextResponse.json({
            message: "Rating submitted successfully",
            rating: newRating
        });
    } catch (error) {
        console.error("Error creating rating:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit rating" },
            { status: 500 }
        );
    }
}
