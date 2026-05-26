import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const response = await fetch("https://api.flutterwave.com/v3/banks/NG", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            console.error("Flutterwave fetch banks error:", data);
            throw new Error(data.message || "Failed to fetch bank list from Flutterwave");
        }

        // Filter out duplicate bank codes to prevent React unique key errors
        const uniqueBanksMap = new Map();
        data.data.forEach(bank => {
            if (bank.code && !uniqueBanksMap.has(bank.code)) {
                uniqueBanksMap.set(bank.code, {
                    code: bank.code,
                    name: bank.name
                });
            }
        });

        const banks = Array.from(uniqueBanksMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ banks });
    } catch (error) {
        console.error("Error fetching banks:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
