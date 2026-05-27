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

            await tx.user.update({
                where: { id: userId },
                data: { cart: {} },
            });
        }, { timeout: 60000 });

        const orderIds = createdOrders.map((o) => o.id);
        const tx_ref = `flw_orders_${orderIds.join("_")}`;

        await prisma.transaction.create({
            data: {
                txRef: tx_ref,
                amount: grandTotal,
                currency: "NGN",
                status: "pending",
                orderIds: orderIds.join(","),
            },
        });

        const flwPayload = {
            tx_ref,
            amount: grandTotal,
            currency: "NGN",
            redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/order/verify/${tx_ref}`,
            customer: {
                email: user.email,
                name: user.name,
            },
            customizations: {
                title: "Darté Store Checkout",
                description: `Payment for Order(s) ${orderIds.join(", ")}`,
                logo: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
            },
        };

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
