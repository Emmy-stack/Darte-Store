import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    const now = new Date();
    if (coupon.expiresAt < now) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to validate coupon' }, { status: 500 });
  }
}
