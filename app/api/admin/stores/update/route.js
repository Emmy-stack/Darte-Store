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
        const { storeId, status } = body;

        if (!storeId || !status) {
            return NextResponse.json({ error: "storeId and status are required" }, { status: 400 });
        }

        const allowedStatuses = ['approved', 'rejected', 'suspended', 'deleted'];
        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ error: "invalid status" }, { status: 400 });
        }

        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                status: status,
                isActive: status === 'approved'
            }
        });

        // On-the-fly subaccount registration on approval
        if (status === 'approved') {
            const payoutAccount = await prisma.sellerPayoutAccount.findUnique({
                where: { storeId }
            });
            if (payoutAccount && !payoutAccount.subaccountId && payoutAccount.bankCode && payoutAccount.accountNumber) {
                console.log(`On-the-fly subaccount registration on approval for Store ${storeId}`);
                try {
                    const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");
                    const { getFlutterwaveSplitValue, normalizePercentageSplitValue } = await import("@/lib/splitUtils");
                    const normalizedSplit = payoutAccount.splitType === "percentage" ? normalizePercentageSplitValue(payoutAccount.splitValue) : payoutAccount.splitValue;
                    const flwSplitValue = getFlutterwaveSplitValue(payoutAccount.splitType, normalizedSplit);
                    
                    const subRes = await fetch("https://api.flutterwave.com/v3/subaccounts", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            account_bank: payoutAccount.bankCode,
                            account_number: payoutAccount.accountNumber,
                            business_name: updatedStore.name,
                            business_email: updatedStore.email,
                            business_contact: updatedStore.name,
                            business_mobile: updatedStore.contact,
                            country: "NG",
                            currency: "NGN",
                            split_type: payoutAccount.splitType,
                            split_value: flwSplitValue,
                        }),
                    });

                    const subData = await subRes.json();
                    if (subRes.ok && subData.status === "success") {
                        const subaccountId = subData.data.subaccount_id || subData.data.id;
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                        console.log(`Registered subaccount ${subaccountId} for approved store ${storeId}`);
                    } else if (isTestMode) {
                        const subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                        console.log(`Registered mock subaccount ${subaccountId} for approved store ${storeId}`);
                    }
                } catch (err) {
                    console.error("Failed to register subaccount on approval:", err);
                }
            }
        }

        return NextResponse.json({ message: `Store successfully ${status}`, store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
