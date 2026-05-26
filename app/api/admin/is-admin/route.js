import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";

export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = await authAdmin(userId);
    return NextResponse.json({ isAdmin: Boolean(isAdmin) });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
