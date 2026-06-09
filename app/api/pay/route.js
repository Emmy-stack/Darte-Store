import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

        const address = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId,
            },
        });

        if (!address) {
            return NextResponse.json({ error: "Address not found or invalid" }, { status: 400 });
        }

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

        const dbProducts = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
        });

        if (dbProducts.length === 0) {
            return NextResponse.json({ error: "No matching products found in database" }, { status: 400 });
        }

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

                const order = await tx.order.create({
                    data: {
                        total: storeTotal,
                        userId,
                        storeId,
                        addressId,
                        paymentMethod: "PAYSTACK",
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

            await tx.user.update({
                where: { id: userId },
                data: { cart: {} },
            });
        }, { timeout: 60000 });

        const orderIds = createdOrders.map((o) => o.id);
        const tx_ref = `paystack_orders_${orderIds.join("_")}`;

        await prisma.transaction.create({
            data: {
                txRef: tx_ref,
                amount: grandTotal,
                currency: "NGN",
                status: "pending",
                orderIds: orderIds.join(","),
            },
        });

        const isLocal = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_BASE_URL?.includes("localhost");
        const isMockMode = isLocal && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY === "mock" || process.env.PAYSTACK_SECRET_KEY.startsWith("mock"));

        if (isMockMode) {
            console.log("Mock Mode: Simulating Paystack payment initialization.");
            return NextResponse.json({
                checkoutUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/order/verify/${tx_ref}?status=successful&transaction_id=MOCK_TX_${Math.random().toString(36).substring(2, 10).toUpperCase()}&reference=${tx_ref}`,
                orders: createdOrders,
            });
        }

        const paystackPayload = {
            email: user.email,
            amount: Math.round(grandTotal * 100), // in kobo
            callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/order/verify/${tx_ref}`,
            reference: tx_ref,
            channels: ["card", "bank", "ussd", "bank_transfer"],
            metadata: {
                orderIds: orderIds.join(",")
            }
        };

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(paystackPayload),
        });

        const paystackData = await response.json();

        if (!response.ok || !paystackData.status) {
            console.error("Paystack API Error:", paystackData);
            throw new Error(paystackData.message || "Failed to initialize payment with Paystack");
        }

        return NextResponse.json({
            checkoutUrl: paystackData.data.authorization_url,
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
