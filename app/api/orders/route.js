import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/orders
export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all orders placed by the current user
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                address: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    }
                },
                orderItems: {
                    include: {
                        product: {
                            include: {
                                store: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        logo: true,
                                    }
                                }
                            }
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform coupon data from JSON to object if needed
        const formattedOrders = orders.map((order) => ({
            ...order,
            coupon: typeof order.coupon === "string" ? JSON.parse(order.coupon) : order.coupon,
        }));

        return NextResponse.json({ orders: formattedOrders });
    } catch (error) {
        console.error("Error fetching customer orders:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch orders" },
            { status: 400 }
        );
    }
}

// POST /api/orders
export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { addressId, paymentMethod, couponCode } = await request.json();

        if (!addressId) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        if (!paymentMethod) {
            return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
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

        // Fetch user's cart
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        const cart = user.cart || {}; // structure: { [productId]: quantity }
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
                    price: product.price, // ensure we use DB price
                });
            }
        }

        const createdOrders = [];

        // Run in transaction to guarantee consistency
        // Timeout set to 60 seconds to handle multiple order creation for Neon serverless
        // Vercel serverless environments may have higher latency
        await prisma.$transaction(async (tx) => {
            for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
                // Calculate store subtotal
                const storeSubtotal = storeItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );

                // Calculate store total with coupon discount if applied
                const storeTotal = coupon
                    ? storeSubtotal * (1 - coupon.discount / 100)
                    : storeSubtotal;

                // Create Order record
                const order = await tx.order.create({
                    data: {
                        total: storeTotal,
                        userId,
                        storeId,
                        addressId,
                        paymentMethod,
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

        return NextResponse.json({
            message: "Order placed successfully",
            orders: createdOrders,
        });
    } catch (error) {
        console.error("Error creating orders:", error);
        return NextResponse.json(
            { error: error.message || "Failed to place order" },
            { status: 500 }
        );
    }
}
