import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getFlutterwaveSplitValue, normalizePercentageSplitValue } from "@/lib/splitUtils";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { addressId, couponCode } = await request.json();

        if (!addressId) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        // Validate address
        const address = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId,
            },
        });

        if (!address) {
            return NextResponse.json({ error: "Address not found or invalid" }, { status: 400 });
        }

        // Fetch user's cart and details
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        const cart = user.cart || {};
        const productIds = Object.keys(cart);

        if (productIds.length === 0) {
            return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
        }

        // Fetch actual products from database
        const dbProducts = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
        });

        if (dbProducts.length === 0) {
            return NextResponse.json({ error: "No matching products found in database" }, { status: 400 });
        }

        // Validate coupon if provided
        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findFirst({
                where: {
                    code: {
                        equals: couponCode,
                        mode: "insensitive",
                    },
                },
            });

            if (!coupon) {
                return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
            }

            if (coupon.expiresAt < new Date()) {
                return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
            }
        }

        // Group products/cart items by storeId
        const itemsByStore = {};
        for (const product of dbProducts) {
            const quantity = cart[product.id];
            if (quantity && quantity > 0) {
                if (!itemsByStore[product.storeId]) {
                    itemsByStore[product.storeId] = [];
                }
                itemsByStore[product.storeId].push({
                    product,
                    quantity,
                    price: product.price,
                });
            }
        }

        const createdOrders = [];
        let grandTotal = 0;

        // Run in transaction to guarantee consistency
        await prisma.$transaction(async (tx) => {
            for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
                const storeSubtotal = storeItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );

                const storeTotal = coupon
                    ? storeSubtotal * (1 - coupon.discount / 100)
                    : storeSubtotal;

                grandTotal += storeTotal;

                // Create Order record with paymentMethod: FLUTTERWAVE
                const order = await tx.order.create({
                    data: {
                        total: storeTotal,
                        userId,
                        storeId,
                        addressId,
                        paymentMethod: "FLUTTERWAVE",
                        isPaid: false,
                        isCouponUsed: !!coupon,
                        coupon: coupon
                            ? {
                                  code: coupon.code,
                                  discount: coupon.discount,
                                  description: coupon.description,
                              }
                            : {},
                        orderItems: {
                            create: storeItems.map((item) => ({
                                productId: item.product.id,
                                quantity: item.quantity,
                                price: item.price,
                            })),
                        },
                    },
                });

                createdOrders.push(order);
            }

            // Clear the user's cart in database
            await tx.user.update({
                where: { id: userId },
                data: { cart: {} },
            });
        }, { timeout: 60000 });

        // Generate the Flutterwave tx_ref
        const orderIds = createdOrders.map(o => o.id);
        const tx_ref = `flw_orders_${orderIds.join("_")}`;

        // 1. Identify all store IDs involved in the cart
        const storeIds = Object.keys(itemsByStore);

        // 2. Fetch payout accounts and linked stores
        const payoutAccounts = await prisma.sellerPayoutAccount.findMany({
            where: { storeId: { in: storeIds } },
            include: { store: true }
        });

        const payoutMap = {};
        for (const pa of payoutAccounts) {
            payoutMap[pa.storeId] = pa;
        }

        // 3. Build subaccounts list dynamically
        const subaccounts = [];
        const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY.startsWith("FLWSECK_TEST-");

        for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
            const storeSubtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const storeTotal = coupon ? storeSubtotal * (1 - coupon.discount / 100) : storeSubtotal;

            let payoutAccount = payoutMap[storeId];
            if (!payoutAccount) continue; // Skip split if bank details not linked

            let subaccountId = payoutAccount.subaccountId;

            // Auto-register subaccount on-the-fly if missing but bank details exist (backward compatibility)
            if (!subaccountId && payoutAccount.bankCode && payoutAccount.accountNumber) {
                console.log(`On-the-fly subaccount registration for Store ${storeId}`);
                try {
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
                            business_name: payoutAccount.store.name,
                            business_email: payoutAccount.store.email,
                            business_contact: payoutAccount.store.name,
                            business_mobile: payoutAccount.store.contact,
                            country: "NG",
                            currency: "NGN",
                            split_type: payoutAccount.splitType,
                            split_value: flwSplitValue,
                        }),
                    });

                    const subData = await subRes.json();
                    if (subRes.ok && subData.status === "success") {
                        subaccountId = subData.data.subaccount_id || subData.data.id;
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                    } else if (isTestMode) {
                        subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                        await prisma.sellerPayoutAccount.update({
                            where: { id: payoutAccount.id },
                            data: { subaccountId }
                        });
                    }
                } catch (err) {
                    console.error("Failed on-the-fly subaccount registration:", err);
                    if (isTestMode) {
                        subaccountId = "RS_MOCK_SUB_" + Math.random().toString(36).substring(2, 10).toUpperCase();
                    }
                }
            }

            if (subaccountId) {
                // Enforce exactly 0.02 (2%) transaction charge for the platform, leaving 98% for the seller.
                // We use transaction_split_ratio proportional to storeTotal to handle multi-vendor carts correctly.
                subaccounts.push({
                    id: subaccountId,
                    transaction_charge_type: "percentage",
                    transaction_charge: 0.02,
                    transaction_split_ratio: storeTotal
                });
            }
        }

        // Build Flutterwave transaction payload
        const flwPayload = {
            tx_ref,
            amount: grandTotal,
            currency: "NGN",
            redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/verify`,
            customer: {
                email: user.email,
                name: user.name,
            },
            customizations: {
                title: "Darté Store Checkout",
                description: `Payment for Order(s) ${orderIds.join(", ")}`,
                logo: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
            },
            meta: [
                {
                    metaname: "rave_escrow_tx",
                    metavalue: "1"
                }
            ]
        };

        if (subaccounts.length > 0) {
            flwPayload.subaccounts = subaccounts;
        }

        // Note: We initialize split payments at checkout with subaccounts and
        // the rave_escrow_tx: "1" metadata to hold funds in escrow. The split
        // funds are released to the subaccounts when the buyer confirms delivery.

        // Call Flutterwave to initialize transaction
        const response = await fetch("https://api.flutterwave.com/v3/payments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(flwPayload),
        });

        const flwData = await response.json();

        if (!response.ok || flwData.status !== "success") {
            console.error("Flutterwave API Error:", flwData);
            throw new Error(flwData.message || "Failed to initialize payment with Flutterwave");
        }

        return NextResponse.json({
            checkoutUrl: flwData.data.link,
            orders: createdOrders,
        });

    } catch (error) {
        console.error("Error initiating Flutterwave payment:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initialize payment" },
            { status: 500 }
        );
    }
}
