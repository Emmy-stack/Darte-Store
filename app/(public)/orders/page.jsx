'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import Loading from "@/components/Loading";

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/orders', { credentials: 'include' });
            
            if (response.status === 401) {
                setError("Unauthorized");
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            
            const data = await response.json();
            setOrders(data.orders || []);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <Loading />
            </div>
        );
    }

    if (error === "Unauthorized") {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Please Sign In</h2>
                <p className="text-slate-500 mb-6">You need to be logged in to view your order history.</p>
                <a
                  href="/sign-in"
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-full text-sm shadow transition"
                >
                  Sign In
                </a>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
                <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button
                    onClick={fetchOrders}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-full text-sm shadow transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                <div className="my-20 max-w-7xl mx-auto animate-in fade-in duration-300">
                    <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                    <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                        <thead>
                            <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                <th className="text-left font-semibold">Product</th>
                                <th className="text-center font-semibold">Total Price</th>
                                <th className="text-left font-semibold">Address</th>
                                <th className="text-left font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <OrderItem order={order} key={order.id} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400 py-16 text-center animate-in fade-in duration-300">
                    <h1 className="text-2xl sm:text-4xl font-semibold mb-2 text-slate-800">You have no orders</h1>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm">Looks like you haven&apos;t placed any orders yet. Head back to the store to start shopping!</p>
                    <a
                      href="/shop"
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-full text-sm shadow transition animate-pulse"
                    >
                      Start Shopping
                    </a>
                </div>
            )}
        </div>
    )
}