'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import formatPrice from '@/lib/formatPrice'

export default function StoreOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [error, setError] = useState(null)
    const [updating, setUpdating] = useState(false)
    const [pendingDeliveryOrder, setPendingDeliveryOrder] = useState(null)


    const fetchOrders = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/store/orders')

            if (!response.ok) {
                throw new Error('Failed to fetch orders')
            }

            const data = await response.json()
            setOrders(data.orders || [])
        } catch (err) {
            console.error('Error fetching orders:', err)
            setError(err.message || 'Failed to load orders')
        } finally {
            setLoading(false)
        }
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setUpdating(true)
            const response = await fetch(`/api/store/orders/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!response.ok) {
                throw new Error('Failed to update order status')
            }

            const data = await response.json()

            // Update the orders list with the new status
            setOrders(orders.map(order =>
                order.id === orderId
                    ? { ...order, status: newStatus }
                    : order
            ))

            // Update selected order if it's open
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus })
            }
        } catch (err) {
            console.error('Error updating order status:', err)
            alert('Failed to update order status: ' + err.message)
        } finally {
            setUpdating(false)
        }
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    if (error) {
        return (
            <div className="text-center py-10">
                <h1 className="text-2xl text-slate-500 dark:text-slate-400 mb-5">Store <span className="text-slate-800 dark:text-slate-200 font-medium">Orders</span></h1>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                    {error}
                </div>
                <button
                    onClick={fetchOrders}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-400 transition"
                >
                    Try Again
                </button>
            </div>
        )
    }

    return (
        <>
            <h1 className="text-2xl text-slate-500 dark:text-slate-400 mb-5">Store <span className="text-slate-800 dark:text-slate-200 font-medium">Orders</span></h1>
            {orders.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No orders found</p>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200 dark:border-slate-800">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-slate-300">
                        <thead className="bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                            <tr>
                                {["Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 text-green-600 dark:text-green-400" >
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3">{order.user?.name}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{currency}{formatPrice(order.total)}</td>
                                    <td className="px-4 py-3">{order.paymentMethod}</td>
                                    <td className="px-4 py-3">
                                        {order.isCouponUsed ? (
                                            <span className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                                                {order.coupon?.code}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
                                        {['completed', 'DELIVERED', 'DELIVERY_CONFIRMED', 'DELIVERY_DENIED'].includes(order.status) ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                ['completed', 'DELIVERY_CONFIRMED'].includes(order.status)
                                                    ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                                                    : order.status === 'DELIVERY_DENIED'
                                                        ? 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
                                                }`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        ) : (
                                            <select
                                                value={order.status}
                                                onChange={e => {
                                                    const newStatus = e.target.value;
                                                    if (newStatus === "DELIVERED") {
                                                        setPendingDeliveryOrder({ orderId: order.id });
                                                    } else {
                                                        updateOrderStatus(order.id, newStatus);
                                                    }
                                                }}
                                                disabled={updating}
                                                className="border border-gray-300 dark:border-slate-700 rounded-md text-sm px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
                                            >
                                                {order.paymentMethod === 'PAYSTACK' ? (
                                                    <>
                                                        <option value="paid_pending_confirmation">paid_pending_confirmation</option>
                                                        <option value="PROCESSING">PROCESSING</option>
                                                        <option value="SHIPPED">SHIPPED</option>
                                                        <option value="DELIVERED">DELIVERED</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="ORDER_PLACED">ORDER_PLACED</option>
                                                        <option value="PROCESSING">PROCESSING</option>
                                                        <option value="SHIPPED">SHIPPED</option>
                                                        <option value="DELIVERED">DELIVERED</option>
                                                    </>
                                                )}
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delivery Confirmation Modal */}
            {pendingDeliveryOrder && (
                <div onClick={() => setPendingDeliveryOrder(null)} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 dark:text-slate-300 text-sm backdrop-blur-xs z-50 animate-in fade-in duration-200">
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6 relative border dark:border-slate-800">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            Confirm Delivery
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Have you delivered this order? This will mark the order as delivered and send an email to the buyer requesting confirmation. You will receive payment only after the buyer confirms.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPendingDeliveryOrder(null)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-750 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                                No, Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const { orderId } = pendingDeliveryOrder;
                                    setPendingDeliveryOrder(null);
                                    await updateOrderStatus(orderId, "DELIVERED");
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition"
                            >
                                Yes, Confirmed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 dark:text-slate-300 text-sm backdrop-blur-xs z-50" >
                    <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative border dark:border-slate-800">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 text-center">
                            Order Details
                        </h2>

                        {/* Customer Details */}
                        <div className="mb-4">
                            <h3 className="font-semibold dark:text-white mb-2">Customer Details</h3>
                            <p><span className="text-green-700 dark:text-green-400">Name:</span> {selectedOrder.user?.name}</p>
                            <p><span className="text-green-700 dark:text-green-400">Email:</span> {selectedOrder.user?.email}</p>
                            <p><span className="text-green-700 dark:text-green-400">Phone:</span> {selectedOrder.address?.phone}</p>
                            <p><span className="text-green-700 dark:text-green-400">Address:</span> {`${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`}</p>
                        </div>

                        {/* Products */}
                        <div className="mb-4">
                            <h3 className="font-semibold dark:text-white mb-2">Products</h3>
                            <div className="space-y-2">
                                {selectedOrder.orderItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 border border-slate-100 dark:border-slate-800 shadow rounded p-2">
                                        <img
                                            src={item.product.images?.[0].src || item.product.images?.[0]}
                                            alt={item.product?.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-slate-800 dark:text-slate-200">{item.product?.name}</p>
                                            <p>Qty: {item.quantity}</p>
                                            <p>Price: {currency}{formatPrice(item.price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Status */}
                        <div className="mb-4">
                            <p><span className="text-green-700 dark:text-green-400">Payment Method:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className="text-green-700 dark:text-green-400">Paid:</span> {selectedOrder.isPaid ? "Yes" : "No"}</p>
                            {selectedOrder.isCouponUsed && (
                                <p><span className="text-green-700 dark:text-green-400">Coupon:</span> {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                            )}
                            <p><span className="text-green-700 dark:text-green-400">Status:</span> {selectedOrder.status}</p>
                            <p><span className="text-green-700 dark:text-green-400">Order Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button onClick={closeModal} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition" >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
