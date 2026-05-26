'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import axios from "axios"
import { useAuth } from "@clerk/nextjs"
import { ChevronDown, Trash2 } from "lucide-react"
import Image from "next/image"
import formatPrice from "@/lib/formatPrice"

export default function AdminStores() {
    const { getToken } = useAuth()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [openDropdown, setOpenDropdown] = useState(null)
    const [manageStoreId, setManageStoreId] = useState(null)
    const [manageStoreName, setManageStoreName] = useState('')
    const [manageProducts, setManageProducts] = useState([])
    const [productLoading, setProductLoading] = useState(false)

    const fetchStores = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/admin/stores", {
                headers: { Authorization: `Bearer ${token}` }
            })
            setStores(data.stores || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to fetch stores")
        } finally {
            setLoading(false)
        }
    }

    const refreshStores = async () => {
        setLoading(true)
        await fetchStores()
    }

    const toggleIsActive = async (storeId) => {
        const targetStore = stores.find(s => s.id === storeId);
        if (!targetStore) return;
        
        const newIsActive = !targetStore.isActive;

        // Optimistically update UI
        setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: newIsActive } : s));

        try {
            const token = await getToken()
            const { data } = await axios.post("/api/admin/stores/toggle", 
                { storeId, isActive: newIsActive },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            return data.message;
        } catch (error) {
            // Revert on failure
            setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !newIsActive } : s));
            toast.error(error?.response?.data?.error || "Failed to update store status")
            throw error;
        }
    }

    const handleAdminAction = async (store, action) => {
        if (!store) return
        const messages = {
            remove: `Are you sure you want to remove ${store.name} and their store?`,
            suspend: `Are you sure you want to suspend ${store.name}?`,
            verify: `Are you sure you want to verify ${store.name}?`,
            unverify: `Are you sure you want to unverify ${store.name}?`,
        }

        if (!window.confirm(messages[action] || 'Confirm this action.')) {
            return
        }

        try {
            const token = await getToken()

            if (action === 'remove') {
                await axios.post('/api/admin/stores/remove', { storeId: store.id }, { headers: { Authorization: `Bearer ${token}` } })
                toast.success('Seller removed successfully')
                if (manageStoreId === store.id) {
                    setManageStoreId(null)
                    setManageProducts([])
                }
                await refreshStores()
                return
            }

            if (action === 'unverify') {
                await axios.post('/api/admin/verification', { storeId: store.id, action: 'unverify' }, { headers: { Authorization: `Bearer ${token}` } })
                toast.success('Store verification removed')
                await refreshStores()
                return
            }

            if (action === 'verify') {
                await axios.post('/api/admin/verification', { storeId: store.id, action: 'verify' }, { headers: { Authorization: `Bearer ${token}` } })
                toast.success('Store verified successfully')
                await refreshStores()
                return
            }

            const statusMap = {
                suspend: 'suspended',
            }

            const { data } = await axios.post('/api/admin/stores/update', { storeId: store.id, status: statusMap[action] }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message)
            await refreshStores()
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Action failed')
        } finally {
            setOpenDropdown(null)
        }
    }

    const fetchManageProducts = async (store) => {
        if (!store) return
        setManageStoreId(store.id)
        setManageStoreName(store.name)
        setManageProducts([])
        setProductLoading(true)
        setOpenDropdown(null)

        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/products/store/${store.id}`, { headers: { Authorization: `Bearer ${token}` } })
            setManageProducts(data.products || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to load products')
        } finally {
            setProductLoading(false)
        }
    }

    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Delete ${productName}? This action cannot be undone.`)) {
            return
        }

        try {
            const token = await getToken()
            const { data } = await axios.delete(`/api/admin/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
            setManageProducts(prev => prev.filter(product => product.id !== productId))
            toast.success(data.message || 'Product deleted successfully')
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to delete product')
        }
    }

    useEffect(() => {
        fetchStores()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Live <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 max-w-4xl" >
                            <div className="flex flex-col gap-4">
                                <StoreInfo store={store} />
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setOpenDropdown(openDropdown === store.id ? null : store.id)}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                                    >
                                        Action <ChevronDown size={16} />
                                    </button>

                                    {openDropdown === store.id && (
                                        <div className="absolute left-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                            <button onClick={() => handleAdminAction(store, 'remove')} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50">Remove</button>
                                            <button onClick={() => handleAdminAction(store, 'suspend')} className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50">Suspend</button>
                                            {store.verificationStatus === 'approved' ? (
                                                <button onClick={() => handleAdminAction(store, 'unverify')} className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50">Unverify</button>
                                            ) : (
                                                <button onClick={() => handleAdminAction(store, 'verify')} className="w-full text-left px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50">Verify</button>
                                            )}
                                            <button onClick={() => fetchManageProducts(store)} className="w-full text-left px-4 py-3 text-sm text-sky-600 hover:bg-sky-50">Manage product</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No stores Available</h1>
                </div>
            )
            }

            {manageStoreId && (
                <div className="mt-10 bg-white border border-slate-200 rounded-lg p-6 shadow-sm max-w-6xl">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800">Managing products for {manageStoreName}</h2>
                            <p className="text-sm text-slate-500">Delete seller products directly from this admin view.</p>
                        </div>
                        <button type="button" onClick={() => setManageStoreId(null)} className="text-sm text-slate-500 hover:text-slate-700">Close</button>
                    </div>

                    {productLoading ? (
                        <div className="mt-6 text-slate-500">Loading products...</div>
                    ) : manageProducts.length === 0 ? (
                        <div className="mt-6 text-slate-500">No products found for this seller.</div>
                    ) : (
                        <table className="w-full mt-6 text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                            <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3 hidden md:table-cell">Description</th>
                                    <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {manageProducts.map((product) => (
                                    <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 items-center">
                                                <Image width={40} height={40} className='p-1 shadow rounded cursor-pointer' src={product.images[0]} alt="" />
                                                {product.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">{product.description}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">{formatPrice(product.mrp)}</td>
                                        <td className="px-4 py-3">{formatPrice(product.price > 0 ? product.price : product.mrp)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteProduct(product.id, product.name)}
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
                </div>
            )}
        </div>
    ) : <Loading />
}