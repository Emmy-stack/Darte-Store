'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import toast from 'react-hot-toast';

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    const getProductName = () => {
        const product = products.find(p => p.id === productId);
        return product?.name || 'Item';
    }

    const persistCart = async (newCart) => {
        try {
            await fetch('/api/cart', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ cart: newCart })
            })
        } catch (err) {
            console.error('Failed to persist cart', err)
        }
    }

    const addToCartHandler = () => {
        const current = cartItems[productId] || 0
        const newCart = { ...cartItems, [productId]: current + 1 }
        dispatch(addToCart({ productId }))
        persistCart(newCart)
        toast.success(`${getProductName()} quantity: ${current + 1}`, { id: `cart-${productId}` })
    }

    const removeFromCartHandler = () => {
        const current = cartItems[productId] || 0
        if (current <= 0) return
        const newCart = { ...cartItems }
        if (current === 1) {
            delete newCart[productId]
            toast.success(`${getProductName()} removed from cart`, { id: `cart-${productId}` })
        } else {
            newCart[productId] = current - 1
            toast.success(`${getProductName()} quantity: ${current - 1}`, { id: `cart-${productId}` })
        }
        dispatch(removeFromCart({ productId }))
        persistCart(newCart)
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none hover:text-red-500 active:scale-90 transition-all">-</button>
            <p className="p-1 min-w-[20px] text-center tabular-nums">{cartItems[productId] || 0}</p>
            <button onClick={addToCartHandler} className="p-1 select-none hover:text-green-600 active:scale-90 transition-all">+</button>
        </div>
    )
}

export default Counter