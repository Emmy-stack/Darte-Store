import { NextResponse } from "next/server";
import { triggerSellerPayout } from "@/lib/payout";

export async function POST(request) {
    try {
        const secretHeader = request.headers.get("x-internal-secret");
        
        // Enforce internal security
        if (!secretHeader || secretHeader !== process.env.FLUTTERWAVE_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }

        // Call the payout helper
        await triggerSellerPayout(orderId);

        return NextResponse.json({ message: "Payout transfer process triggered" });
    } catch (error) {
        console.error("Payout API endpoint error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
