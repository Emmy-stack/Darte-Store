'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import formatPrice from '@/lib/formatPrice'
import toast from "react-hot-toast";

const OrderItem = ({ order }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
    const [ratingModal, setRatingModal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const { ratings } = useSelector(state => state.rating);

    const handleConfirmDelivery = async () => {
        try {
            setActionLoading(true);
            const res = await fetch(`/api/orders/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id })
            });
            if (res.ok) {
                toast.success("Order confirmed! Payout has been released.");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to confirm delivery");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDenyDelivery = async () => {
        if (window.confirm("Are you sure you want to deny receipt of this order? This will open a dispute and notify the admin and seller.")) {
            try {
                setActionLoading(true);
                const res = await fetch(`/api/orders/${order.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deny' })
                });
                if (res.ok) {
                    toast.success("Delivery dispute opened. Support has been notified.");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to deny delivery");
                }
            } catch (err) {
                console.error(err);
                toast.error("An error occurred");
            } finally {
                setActionLoading(false);
            }
        }
    };

    return (
        <>
            <tr className="text-sm">
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {order.orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                                    <Image
                                        className="h-14 w-auto"
                                        src={item.product.images[0]}
                                        alt="product_img"
                                        width={50}
                                        height={50}
                                    />
                                </div>
                                <div className="flex flex-col justify-center text-sm">
                                    <p className="font-medium text-slate-600 text-base">{item.product.name}</p>
                                    <p>{currency}{formatPrice(item.price)} Qty : {item.quantity} </p>
                                    <p className="mb-1">{new Date(order.createdAt).toDateString()}</p>
                                    <div>
                                        {ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId)
                                            ? <Rating value={ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId).rating} />
                                            : <button onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })} className={`text-green-500 hover:bg-green-50 transition ${order.status !== "completed" && 'hidden'}`}>Rate Product</button>
                                        }</div>
                                    {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </td>

                <td className="text-center max-md:hidden">{currency}{formatPrice(order.total)}</td>

                <td className="text-left max-md:hidden">
                    <p>{order.address.name}, {order.address.street},</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country},</p>
                    <p>{order.address.phone}</p>
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    <div
                        className={`flex items-center justify-center gap-1 rounded-full p-1.5 font-medium ${
                            order.status === 'completed' || order.status === 'DELIVERY_CONFIRMED'
                                ? 'text-green-700 bg-green-50'
                                : order.status === 'DELIVERY_DENIED'
                                    ? 'text-red-700 bg-red-50'
                                    : order.status === 'paid_pending_confirmation' || order.status === 'DELIVERED'
                                        ? 'text-amber-700 bg-amber-50'
                                        : 'text-slate-500 bg-slate-50'
                        }`}
                    >
                        <DotIcon size={10} className="scale-250" />
                        {order.status.split('_').join(' ').toLowerCase()}
                    </div>
                    {['paid_pending_confirmation', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                        <div className="flex flex-col gap-2 mt-2">
                            <button
                                onClick={handleConfirmDelivery}
                                disabled={actionLoading}
                                className="w-full text-center py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                            >
                                Confirm Order Received
                            </button>
                        </div>
                    )}
                </td>
            </tr>
            {/* Mobile */}
            <tr className="md:hidden">
                <td colSpan={5} className="space-y-3 pb-4">
                    <p>{order.address.name}, {order.address.street}</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
                    <p>{order.address.phone}</p>
                    <div className="flex flex-col gap-2 mt-3 items-center">
                        <span className={`px-4 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'completed' || order.status === 'DELIVERY_CONFIRMED'
                                ? 'text-green-700 bg-green-50'
                                : order.status === 'DELIVERY_DENIED'
                                    ? 'text-red-700 bg-red-50'
                                    : order.status === 'paid_pending_confirmation' || order.status === 'DELIVERED'
                                        ? 'text-amber-700 bg-amber-50'
                                        : 'text-slate-600 bg-slate-50'
                        }`}>
                            {order.status.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        {['paid_pending_confirmation', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                            <div className="flex gap-4 mt-2 w-full justify-center">
                                <button
                                    onClick={handleConfirmDelivery}
                                    disabled={actionLoading}
                                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                                >
                                    Confirm Order Received
                                </button>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>
        </>
    )
}

export default OrderItem