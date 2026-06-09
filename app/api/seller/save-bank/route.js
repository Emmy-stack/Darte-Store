import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user's store
        const store = await prisma.store.findUnique({
            where: { userId }
        });

        if (!store) {
            return NextResponse.json({ error: "Seller store not found" }, { status: 404 });
        }

        const { bankCode, bankName, accountNumber } = await request.json();
        const splitType = "percentage";
        const splitValue = 98.0;

        if (!bankCode || !bankName || !accountNumber) {
            return NextResponse.json({ error: "Bank code, bank name, and account number are required" }, { status: 400 });
        }

        const isLocal = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_BASE_URL?.includes("localhost");
        const isMockMode = isLocal && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === "mock" || process.env.PAYSTACK_SECRET_KEY.startsWith("mock"));

        let accountName = "TEST ACCOUNT (SANDBOX)";
        let subaccountId = null;

        if (!isMockMode) {
            // Call Paystack to resolve account details
            const resolveResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const resolveData = await resolveResponse.json();

            if (!resolveResponse.ok || !resolveData.status) {
                console.error("Paystack save-bank verification failed:", resolveData);
                return NextResponse.json({ error: resolveData.message || "Failed to verify bank details with Paystack" }, { status: 400 });
            }

            accountName = resolveData.data.account_name;

            // Create new Paystack transfer recipient
            const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "nuban",
                    name: accountName,
                    account_number: accountNumber,
                    bank_code: bankCode,
                    currency: "NGN",
                }),
            });

            const recipientData = await recipientResponse.json();

            if (!recipientResponse.ok || !recipientData.status) {
                console.error("Paystack recipient creation failed:", recipientData);
                return NextResponse.json({ error: recipientData.message || "Failed to create transfer recipient with Paystack" }, { status: 400 });
            }

            subaccountId = recipientData.data.recipient_code;
        } else {
            console.log("Mock Mode: Simulating resolved account name and Paystack recipient code.");
            subaccountId = "RCP_" + Math.random().toString(36).substring(2, 12).toUpperCase();
        }

        // Upsert Seller Payout Account
        const payoutAccount = await prisma.sellerPayoutAccount.upsert({
            where: {
                storeId: store.id,
            },
            update: {
                bankCode,
                bankName,
                accountNumber,
                accountName,
                isVerified: true,
                subaccountId,
                splitType,
                splitValue,
            },
            create: {
                storeId: store.id,
                bankCode,
                bankName,
                accountNumber,
                accountName,
                isVerified: true,
                subaccountId,
                splitType,
                splitValue,
            },
        });

        console.log(`Saved payout account: storeId=${store.id}, recipient=${subaccountId}`);
        return NextResponse.json({ message: "Payout account saved successfully", payoutAccount });

    } catch (error) {
        console.error("Error saving seller bank account:", error);
        return NextResponse.json({ error: error.message || "Failed to save bank account" }, { status: 500 });
    }
}
