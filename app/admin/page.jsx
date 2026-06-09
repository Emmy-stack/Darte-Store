'use client'
import axios from "axios"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon, RotateCcw, HelpCircle } from "lucide-react"
import { useEffect, useState } from "react"
import formatPrice from "@/lib/formatPrice"

export default function AdminDashboard() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

    const [loading, setLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [dashboardData, setDashboardData] = useState({
        products: 0,
        revenue: 0,
        orders: 0,
        stores: 0,
        allOrders: [],
        resetAt: null
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.products, icon: ShoppingBasketIcon },
        { title: 'Total Revenue', value: currency + formatPrice(dashboardData.revenue), icon: CircleDollarSignIcon, resettable: true },
        { title: 'Total Orders', value: dashboardData.orders, icon: TagsIcon, resettable: true },
        { title: 'Total Stores', value: dashboardData.stores, icon: StoreIcon },
    ]

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get('/api/admin/dashboard');
            if (response.data.success) {
                setDashboardData(response.data.dashboardData);
            } else {
                toast.error(response.data.message || "Failed to load dashboard data");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "An error occurred fetching dashboard data");
        } finally {
            setLoading(false);
        }
    }

    const handleMetricsAction = async (action) => {
        const confirmMsg = action === "reset" 
            ? "Are you sure you want to reset total revenue and total orders metrics to zero? This will only reset the dashboard counters. No order details will be deleted from the database."
            : "Are you sure you want to restore your metrics back to all-time values?";

        if (!window.confirm(confirmMsg)) return;

        try {
            setIsActionLoading(true)
            const response = await axios.post('/api/admin/dashboard', { action });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            } else {
                toast.error(response.data.message || "Failed to execute action");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "An error occurred processing action");
        } finally {
            setIsActionLoading(false)
        }
    }

    useEffect(() => {
        const markNotificationsSeen = async () => {
            try {
                await axios.post("/api/admin/notifications/seen", {}, {
                    withCredentials: true
                });
            } catch (error) {
                console.error("Failed to mark notifications as seen on dashboard:", error);
            }
        };
        markNotificationsSeen();
        fetchDashboardData();
    }, [])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 max-w-7xl">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800">
                        Admin <span className="text-slate-500 font-light">Dashboard</span>
                    </h1>
                    {dashboardData.resetAt && (
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                            Displaying orders submitted after {new Date(dashboardData.resetAt).toLocaleString()}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {dashboardData.resetAt ? (
                        <>
                            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                Stats Reset Active
                            </span>
                            <button
                                onClick={() => handleMetricsAction("restore")}
                                disabled={isActionLoading}
                                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-semibold flex items-center gap-1 transition active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                Restore All-Time
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => handleMetricsAction("reset")}
                            disabled={isActionLoading}
                            className="px-4 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            <RotateCcw size={12} className={isActionLoading ? "animate-spin" : ""} />
                            Reset Metrics
                        </button>
                    )}
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className={`flex items-center justify-between border p-5 px-6 rounded-2xl shadow-sm hover:shadow-md transition bg-white ${card.resettable && dashboardData.resetAt ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200'}`}>
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</p>
                                <b className="text-2xl font-semibold text-slate-800">{card.value}</b>
                            </div>
                            <div className="relative group">
                                <card.icon size={44} className={`p-2.5 rounded-full ${card.resettable && dashboardData.resetAt ? 'text-amber-500 bg-amber-50' : 'text-slate-400 bg-slate-100'}`} />
                                {card.resettable && dashboardData.resetAt && (
                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-10 w-40 text-center font-medium">
                                        This value has been reset. Restore all-time stats using the button in the header.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* Area Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <OrdersAreaChart allOrders={dashboardData.allOrders} />
            </div>
        </div>
    )
}