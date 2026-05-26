import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Get store info and store products

export async function GET(request){
    try {
        // Get store usernames from query params
        const {searchParams} = new URL(request.url)
        const username = searchParams.get('username').toLowerCase();

        if (!username) {
            return NextResponse.json({error: "missing username"}, {status: 400})
        }

        // Get store info and only in-stock products with ratings
        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: {
                Product: {
                    where: { inStock: true },
                    include: { rating: true },
                },
                followers: true,
            },
        })

        if (!store) {
            return NextResponse.json({error: "store not found"}, {status: 400})
        }

        // Check if current user is following this store
        let isFollowing = false;
        const { userId } = getAuth(request);
        if (userId) {
            isFollowing = store.followers.some(f => f.userId === userId);
        }

        const followersCount = store.followers.length;

        // Strip followers out from store to avoid sending raw array if not needed, but keep data
        const { followers, ...storeData } = store;

        return NextResponse.json({
            store: storeData,
            products: storeData.Product,
            isFollowing,
            followersCount
        })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}