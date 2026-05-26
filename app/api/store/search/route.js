import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/store/search?q=<query>
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        
        if (!query || query.trim() === '') {
            return NextResponse.json({ stores: [] });
        }

        const trimmedQuery = query.trim();

        // Search for active stores matching name, username, or email
        const stores = await prisma.store.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { username: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                logo: true,
                description: true,
                verificationStatus: true,
            },
            take: 12 // Limit results for clean presentation and high performance
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error("Error searching stores:", error);
        return NextResponse.json(
            { error: error.message || "Failed to search stores" },
            { status: 400 }
        );
    }
}
