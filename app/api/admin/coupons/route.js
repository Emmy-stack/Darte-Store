import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const coupons = await prisma.coupon.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ coupons });
    } catch (error) {
        console.error("Fetch coupons error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { code, description, discount, forNewUser, forMember, expiresAt } = body;

        if (!code || !description || !discount || !expiresAt) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if coupon code already exists
        const existingCoupon = await prisma.coupon.findUnique({
            where: { code }
        });

        if (existingCoupon) {
            return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
        }

        const parsedDiscount = parseFloat(discount);
        const parsedDate = new Date(expiresAt);

        const newCoupon = await prisma.coupon.create({
            data: {
                code,
                description,
                discount: parsedDiscount,
                forNewUser: Boolean(forNewUser),
                forMember: Boolean(forMember),
                isPublic: false, // Defaulting to false as per plan
                expiresAt: parsedDate
            }
        });

        return NextResponse.json({ message: "Coupon created successfully", coupon: newCoupon }, { status: 201 });
    } catch (error) {
        console.error("Create coupon error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
