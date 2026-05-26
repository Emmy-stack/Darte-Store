import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getFlutterwaveSplitValue, normalizePercentageSplitValue } from "@/lib/splitUtils";

async function getNumericIdFromSubaccountId(subaccountId, apiKey) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        try {
            const res = await fetch(`https://api.flutterwave.com/v3/subaccounts?page=${page}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                }
            });
            const data = await res.json();
            if (!res.ok || data.status !== "success") {
                break;
            }
            const list = data.data || [];
            if (list.length === 0) {
                hasMore = false;
            } else {
                const found = list.find(sub => sub.subaccount_id === subaccountId);
                if (found) {
                    return found.id;
                }
                const pageInfo = data.meta?.page_info;
                if (pageInfo && pageInfo.current_page >= pageInfo.total_pages) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        } catch (err) {
            console.error("Error in getNumericIdFromSubaccountId:", err);
            break;
        }
    }
    return null;
}

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
        const splitValue = 99;
        const normalizedSplitValue = 99;

        if (!bankCode || !bankName || !accountNumber) {
            return NextResponse.json({ error: "Bank code, bank name, and account number are required" }, { status: 400 });
        }

        const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");

        // Call Flutterwave to verify the account details on the server-side
        const flwResponse = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
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

        const flwData = await flwResponse.json();

        let accountName;

        if (!flwResponse.ok || flwData.status !== "success") {
            console.error("Flutterwave save-bank verification failed:", flwData);

            if (isTestMode) {
                console.log("Test mode: Saving payout account with mock account name");
                accountName = "TEST ACCOUNT (SANDBOX)";
            } else {
                return NextResponse.json({ error: flwData.message || "Failed to verify bank details with Flutterwave" }, { status: 400 });
            }
        } else {
            accountName = flwData.data.account_name;
        }

        // Fetch existing payout account to see if subaccountId already exists
        const existingPayout = await prisma.sellerPayoutAccount.findUnique({
            where: { storeId: store.id }
        });

        const flwSplitValue = getFlutterwaveSplitValue(splitType, normalizedSplitValue);
        let subaccountId = existingPayout?.subaccountId || null;
        let numericId = null;

        if (subaccountId && !subaccountId.startsWith("RS_MOCK_SUB_")) {
            numericId = await getNumericIdFromSubaccountId(subaccountId, process.env.FLUTTERWAVE_SECRET_KEY);
        }

        const subaccountPayload = {
            account_bank: bankCode,
            account_number: accountNumber,
            business_name: store.name,
            business_email: store.email,
            business_contact: store.name,
            business_mobile: store.contact,
            country: "NG",
            currency: "NGN",
            split_type: splitType,
            split_value: flwSplitValue,
        };

        try {
            let subaccountResponse;
            if (subaccountId && !subaccountId.startsWith("RS_MOCK_SUB_") && numericId) {
                console.log(`Updating existing Flutterwave subaccount: subaccount_id=${subaccountId}, numericId=${numericId}`);
                subaccountResponse = await fetch(`https://api.flutterwave.com/v3/subaccounts/${numericId}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(subaccountPayload),
                });
            } else {
                console.log("Creating new Flutterwave subaccount");
                subaccountResponse = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(subaccountPayload),
                });
            }

            const subaccountData = await subaccountResponse.json();

            if (!subaccountResponse.ok || subaccountData.status !== "success") {
                console.error("Flutterwave subaccount update/create failed:", subaccountData);
                if (isTestMode) {
                    console.log("Test mode: Generating mock subaccount ID");
                    if (!subaccountId) {
                        subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    }
                } else {
                    return NextResponse.json({ error: subaccountData.message || "Failed to sync subaccount with Flutterwave" }, { status: 400 });
                }
            } else {
                subaccountId = subaccountData.data.subaccount_id || subaccountData.data.id || subaccountId;
            }
        } catch (subError) {
            console.error("Error calling Flutterwave Subaccounts API:", subError);
            if (isTestMode) {
                if (!subaccountId) {
                    subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                }
            } else {
                return NextResponse.json({ error: subError.message || "Error syncing subaccount with Flutterwave" }, { status: 500 });
            }
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
                splitValue: normalizedSplitValue,
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
                splitValue: normalizedSplitValue,
            },
        });

        return NextResponse.json({ message: "Payout account saved successfully", payoutAccount });

    } catch (error) {
        console.error("Error saving seller bank account:", error);
        return NextResponse.json({ error: error.message || "Failed to save bank account" }, { status: 500 });
    }
}
