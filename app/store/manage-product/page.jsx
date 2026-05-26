'use client'
import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import formatPrice from '@/lib/formatPrice'
import { useAuth } from "@clerk/nextjs"
import axios from "axios"

export default function StoreManageProducts() {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'
    const { getToken } = useAuth()

    const displayProductPrice = (product) => product.price > 0 ? product.price : product.mrp

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])

    const fetchProducts = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/store/product", {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.products) {
                setProducts(data.products)
            }
        } catch (error) {
            console.error("Failed to fetch products:", error)
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.delete(`/api/store/product/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(prev => prev.filter(p => p.id !== productId))
            toast.success(data.message || "Product deleted successfully")
            return data
        } catch (error) {
            const errorMessage = error?.response?.data?.error || error.message || "Failed to delete product"
            toast.error(errorMessage)
            throw new Error(errorMessage)
        }
    }

    const handleDeleteClick = async (productId, productName) => {
        const confirmed = window.confirm(`Delete ${productName}? This action cannot be undone.`)
        if (!confirmed) return
        await deleteProduct(productId)
    }

    useEffect(() => {
            fetchProducts()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 dark:text-slate-400 mb-5">Manage <span className="text-slate-800 dark:text-slate-200 font-medium">Products</span></h1>
            {products.length === 0 ? (
                <p className="text-slate-400 mt-10">No products found. Add your first product to get started!</p>
            ) : (
            <table className="w-full max-w-4xl text-left ring ring-slate-200 dark:ring-slate-800 rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-300">
                    {products.map((product) => (
                        <tr key={product.id} className="border-t border-gray-200 dark:border-slate-850 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className='p-1 shadow rounded cursor-pointer' src={product.images[0]} alt="" />
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-md text-slate-600 dark:text-slate-400 hidden md:table-cell truncate">{product.description}</td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency}{formatPrice(product.mrp)}</td>
                            <td className="px-4 py-3">{currency}{formatPrice(displayProductPrice(product))}</td>
                            <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(product.id, product.name)}
                                  className="inline-flex items-center justify-center p-2 rounded-full text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                  aria-label="Delete product"
                                >
                                  <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}
        </>
    )
}