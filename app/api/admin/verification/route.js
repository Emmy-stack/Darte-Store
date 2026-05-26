import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET: Fetch stores with verificationStatus != "none"
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const stores = await prisma.store.findMany({
            where: {
                verificationStatus: { in: ["pending", "approved"] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// POST: Admin verify/reject/unverify a store
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { storeId, action } = body;

        if (!storeId || !action) {
            return NextResponse.json({ error: "storeId and action are required" }, { status: 400 });
        }

        const actionMap = {
            verify: "approved",
            reject: "rejected",
            unverify: "none"
        };

        const newStatus = actionMap[action];
        if (!newStatus) {
            return NextResponse.json({ error: "Invalid action. Use: verify, reject, or unverify" }, { status: 400 });
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: { verificationStatus: newStatus }
        });

        const messages = {
            verify: "Store verified successfully",
            reject: "Store verification rejected",
            unverify: "Store verification removed"
        };

        return NextResponse.json({ message: messages[action], store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
