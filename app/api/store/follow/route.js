import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { storeId } = await request.json();

        if (!storeId) {
            return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
        }

        // Check if store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        // Prevent users from following their own store
        if (store.userId === userId) {
            return NextResponse.json({ error: "You cannot follow your own store" }, { status: 400 });
        }

        // Check if already following
        const existingFollow = await prisma.storeFollower.findUnique({
            where: {
                storeId_userId: {
                    storeId,
                    userId
                }
            }
        });

        let isFollowing = false;

        if (existingFollow) {
            // Unfollow
            await prisma.storeFollower.delete({
                where: {
                    id: existingFollow.id
                }
            });
        } else {
            // Follow
            await prisma.storeFollower.create({
                data: {
                    storeId,
                    userId
                }
            });
            isFollowing = true;
        }

        // Get updated followers count
        const followersCount = await prisma.storeFollower.count({
            where: { storeId }
        });

        return NextResponse.json({
            message: isFollowing ? "Followed store successfully" : "Unfollowed store successfully",
            isFollowing,
            followersCount
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
