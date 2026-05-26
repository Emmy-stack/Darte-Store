'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon, ShoppingBag, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import formatPrice from '@/lib/formatPrice'
import toast from 'react-hot-toast'
import Loading from "@/components/Loading";

export default function Cart() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
    
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    // Determine loading state – products haven't been fetched yet
    const isLoading = products.length === 0 && Object.keys(cartItems).length > 0;

    // Derive cart array and total reactively using useMemo
    // This re-computes instantly whenever cartItems or products change in Redux
    const { cartArray, totalPrice } = useMemo(() => {
        const arr = [];
        let total = 0;
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(p => p.id === key);
            if (product) {
                arr.push({ ...product, quantity: value });
                total += product.price * value;
            }
        }
        return { cartArray: arr, totalPrice: total };
    }, [cartItems, products]);

    const handleDeleteItemFromCart = async (productId, productName) => {
        const confirmed = window.confirm('Are you sure you want to remove this item from your cart?');
        if (!confirmed) return;

        // compute new cart locally
        const newCart = { ...cartItems }
        if (newCart[productId]) {
            delete newCart[productId]
        }
        dispatch(deleteItemFromCart({ productId }))
        toast.success(`${productName || 'Item'} removed from cart`)
        try {
            await fetch('/api/cart', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ cart: newCart })
            })
        } catch (err) {
            console.error('Failed to persist cart delete', err)
        }
    }

    // Loading state – cart has items but products haven't been fetched yet
    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <Loading />
            </div>
        );
    }

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800 animate-in fade-in duration-300">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading="My Cart" text={`${cartArray.length} item${cartArray.length !== 1 ? 's' : ''} in your cart`} linkText="Add more" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    {/* Desktop / Tablet Table */}
                    <table className="w-full max-w-4xl text-slate-600 table-auto max-md:hidden">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Product</th>
                                <th>Quantity</th>
                                <th>Total Price</th>
                                <th>Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item) => (
                                    <tr key={item.id} className="space-x-2 group transition-all duration-200 hover:bg-slate-50/50">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md overflow-hidden group-hover:shadow-sm transition-shadow">
                                                <Image src={item.images[0]} className="h-14 w-auto" alt={item.name} width={45} height={45} />
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm font-medium text-slate-700">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.category}</p>
                                                <p className="text-sm mt-0.5">{currency}{formatPrice(item.price)}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} />
                                        </td>
                                        <td className="text-center font-medium">{currency}{formatPrice(item.price * item.quantity)}</td>
                                        <td className="text-center">
                                            <button onClick={() => handleDeleteItemFromCart(item.id, item.name)} className="text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden w-full flex flex-col gap-4">
                        {
                            cartArray.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-200 hover:shadow-md">
                                    <div className="flex items-center justify-center bg-slate-100 size-18 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image src={item.images[0]} className="h-14 w-auto" alt={item.name} width={45} height={45} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.category}</p>
                                        <div className="flex items-center justify-between mt-2 gap-2">
                                            <p className="text-sm font-semibold text-slate-800">{currency}{formatPrice(item.price * item.quantity)}</p>
                                            <Counter productId={item.id} />
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteItemFromCart(item.id, item.name)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full active:scale-90 transition-all flex-shrink-0">
                                        <Trash2Icon size={16} />
                                    </button>
                                </div>
                            ))
                        }
                    </div>

                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            <div className="flex items-center justify-center w-24 h-24 bg-slate-100 rounded-full mb-6">
                <ShoppingBag size={40} className="text-slate-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">Your cart is empty</h1>
            <p className="text-slate-500 text-sm max-w-sm mb-6">Looks like you haven&apos;t added any items to your cart yet. Browse our collection to find something you love!</p>
            <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-full text-sm shadow transition active:scale-95">
                Start Shopping
                <ArrowRight size={16} />
            </Link>
        </div>
    )
}