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

        const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");

        const response = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_number: accountNumber,
                account_bank: bankCode,
            }),
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            console.error("Flutterwave verify bank error:", data);
            
            if (isTestMode) {
                console.log("Test mode: Returning mock account resolution");
                return NextResponse.json({ accountName: "TEST ACCOUNT (SANDBOX)" });
            }

            return NextResponse.json({ error: data.message || "Could not resolve bank account details. Please check the account number and bank selected." }, { status: 400 });
        }

        return NextResponse.json({ accountName: data.data.account_name });
    } catch (error) {
        console.error("Error verifying bank account:", error);
        return NextResponse.json({ error: error.message || "Failed to verify bank account" }, { status: 500 });
    }
}
