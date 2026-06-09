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
                console.log(`On-the-fly recipient registration on approval for Store ${storeId}`);
                try {
                    const isLocal = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_BASE_URL?.includes("localhost");
                    const isMockMode = isLocal && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === "mock" || process.env.PAYSTACK_SECRET_KEY.startsWith("mock"));
                    let subaccountId = null;

                    if (!isMockMode) {
                        const subRes = await fetch("https://api.paystack.co/transferrecipient", {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                type: "nuban",
                                name: payoutAccount.accountName || updatedStore.name,
                                account_number: payoutAccount.accountNumber,
                                bank_code: payoutAccount.bankCode,
                                currency: "NGN",
                            }),
                        });

                        const subData = await subRes.json();
                        if (subRes.ok && subData.status) {
                            subaccountId = subData.data.recipient_code;
                            await prisma.sellerPayoutAccount.update({
                                where: { id: payoutAccount.id },
                                data: { subaccountId }
                            });
                            console.log(`Registered recipient ${subaccountId} for approved store ${storeId}`);
                        }
                    } else {
                        subaccountId = "RCP_" + Math.random().toString(36).substring(2, 12).toUpperCase();
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                        console.log(`Registered mock recipient ${subaccountId} for approved store ${storeId}`);
                    }
                } catch (err) {
                    console.error("Failed to register recipient on approval:", err);
                }
            }
        }

        return NextResponse.json({ message: `Store successfully ${status}`, store: updatedStore });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
