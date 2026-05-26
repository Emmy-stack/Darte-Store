import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const slides = await prisma.heroSlide.findMany({
            orderBy: {
                index: 'asc'
            }
        });
        
        return NextResponse.json({ success: true, slides });
    } catch (error) {
        console.error("Error fetching hero slides:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
