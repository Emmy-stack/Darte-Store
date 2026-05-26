import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ cart: {} });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const cart = user?.cart || {};
    return NextResponse.json({ cart });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to get cart' }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const cart = body.cart || {};

    await prisma.user.update({ where: { id: userId }, data: { cart } });

    return NextResponse.json({ message: 'Cart saved', cart });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to save cart' }, { status: 400 });
  }
}
