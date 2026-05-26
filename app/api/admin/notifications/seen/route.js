import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenNotificationsAt: new Date() },
    });

    return NextResponse.json({ message: "Admin notifications marked as seen" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to mark notifications as seen" }, { status: 500 });
  }
}
