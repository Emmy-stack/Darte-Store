import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { bankCode, accountNumber } = await request.json();

        if (!bankCode || !accountNumber) {
            return NextResponse.json({ error: "Bank code and account number are required" }, { status: 400 });
        }

        const isMockMode = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === "mock" || process.env.PAYSTACK_SECRET_KEY.startsWith("mock");

        if (isMockMode) {
            console.log("Mock mode: Returning mock account resolution");
            return NextResponse.json({ accountName: "TEST ACCOUNT (SANDBOX)" });
        }

        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error("Paystack verify bank error:", data);
            return NextResponse.json({ error: data.message || "Could not resolve bank account details. Please check the account number and bank selected." }, { status: 400 });
        }

        return NextResponse.json({ accountName: data.data.account_name });
    } catch (error) {
        console.error("Error verifying bank account:", error);
        return NextResponse.json({ error: error.message || "Failed to verify bank account" }, { status: 500 });
    }
}
