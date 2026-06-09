import { NextResponse } from "next/server";

const MOCK_BANKS = [
    { code: "044", name: "Access Bank" },
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "011", name: "First Bank of Nigeria" },
    { code: "232", name: "Sterling Bank" },
    { code: "033", name: "United Bank for Africa" },
    { code: "035", name: "Wema Bank" },
    { code: "057", name: "Zenith Bank" }
];

export async function GET(request) {
    try {
        const isMockMode = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes("mock") || process.env.PAYSTACK_SECRET_KEY.includes("test");
        
        if (isMockMode) {
            return NextResponse.json({ banks: MOCK_BANKS.sort((a, b) => a.name.localeCompare(b.name)) });
        }

        const response = await fetch("https://api.paystack.co/bank?currency=NGN", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error("Paystack fetch banks error:", data);
            // Fallback to mock list instead of failing completely in case of connection issues
            return NextResponse.json({ banks: MOCK_BANKS.sort((a, b) => a.name.localeCompare(b.name)) });
        }

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
        return NextResponse.json({ banks: MOCK_BANKS.sort((a, b) => a.name.localeCompare(b.name)) });
    }
}
