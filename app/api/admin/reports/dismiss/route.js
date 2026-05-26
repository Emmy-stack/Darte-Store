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

        const body = await request.json();
        const { reportId } = body;

        if (!reportId) {
            return NextResponse.json({ error: "reportId is required" }, { status: 400 });
        }

        await prisma.storeReport.delete({
            where: {
                id: reportId
            }
        });

        return NextResponse.json({ message: "Report dismissed successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
