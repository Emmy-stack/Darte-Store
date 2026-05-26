'use client'
import ProductCard from "@/components/ProductCard"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon, Flag, ChevronDown, Trash2, BadgeCheck } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import axios from "axios"
import toast from "react-hot-toast"
import { useAuth } from "@clerk/nextjs"
import formatPrice from "@/lib/formatPrice"

export default function StoreShop() {
  const { username } = useParams()
  const router = useRouter()
  const { userId, getToken } = useAuth()
  const [products, setProducts] = useState([])
  const [storeInfo, setStoreInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportReason, setReportReason] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [showManageProductsModal, setShowManageProductsModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  const fetchStoreData = async () => {
    try {
      const { data } = await axios.get(`/api/store/data?username=${username}`)
      setStoreInfo(data.store)
      setProducts(data.products || [])
      setFollowersCount(data.followersCount || 0)
      setIsFollowing(data.isFollowing || false)
    } catch (error) {
      console.error("Failed to fetch store data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!userId) {
      toast.error('Please sign in to follow this store')
      return
    }

    if (isFollowLoading) return

    setIsFollowLoading(true)
    try {
      const { data } = await axios.post('/api/store/follow', {
        storeId: storeInfo.id
      })
      setIsFollowing(data.isFollowing)
      setFollowersCount(data.followersCount)
      toast.success(data.message)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to toggle follow status')
    } finally {
      setIsFollowLoading(false)
      setOpenDropdown(false)
    }
  }

  const handleReportStore = async () => {
    if (!userId) {
      toast.error('Please sign in to report this store')
      return
    }

    if (!reportReason.trim()) {
      toast.error('Please provide a reason for the report')
      return
    }

    try {
      const { data } = await axios.post('/api/store/report', {
        storeId: storeInfo.id,
        reason: reportReason
      })
      toast.success('Store reported successfully. Our team will review it.')
      setShowReportModal(false)
      setReportReason('')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to report store')
    }
  }

  const handleAdminAction = async (action) => {
    if (!storeInfo) return
    const messages = {
      remove: `Are you sure you want to remove ${storeInfo.name} and their store? This will permanently delete the store.`,
      suspend: `Are you sure you want to suspend ${storeInfo.name}?`,
      verify: `Are you sure you want to verify ${storeInfo.name}?`,
      unverify: `Are you sure you want to unverify ${storeInfo.name}?`,
    }

    if (!window.confirm(messages[action] || 'Confirm this action.')) {
      return
    }

    try {
      const token = await getToken()

      if (action === 'remove') {
        await axios.post('/api/admin/stores/remove', { storeId: storeInfo.id }, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Store removed successfully')
        router.push('/')
        return
      }

      if (action === 'unverify') {
        await axios.post('/api/admin/verification', { storeId: storeInfo.id, action: 'unverify' }, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Store verification removed')
        await fetchStoreData()
        return
      }

      if (action === 'verify') {
        await axios.post('/api/admin/verification', { storeId: storeInfo.id, action: 'verify' }, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Store verified successfully')
        await fetchStoreData()
        return
      }

      const statusMap = {
        suspend: 'suspended',
      }

      const { data } = await axios.post('/api/admin/stores/update', { storeId: storeInfo.id, status: statusMap[action] }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success(data.message)
      await fetchStoreData()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Action failed')
    } finally {
      setOpenDropdown(false)
    }
  }

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Delete ${productName}? This action cannot be undone.`)) {
      return
    }

    try {
      const token = await getToken()
      await axios.delete(`/api/admin/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
      
      // Update UI state reactively
      setProducts(prev => prev.filter(product => product.id !== productId))
      toast.success('Product deleted successfully')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete product')
    }
  }

  useEffect(() => {
    if (username) {
      fetchStoreData()
    }
  }, [username])

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await axios.get('/api/admin/is-admin')
        setIsAdmin(data.isAdmin === true)
      } catch (error) {
        setIsAdmin(false)
      }
    }
    if (userId) {
      checkAdmin()
    } else {
      setIsAdmin(false)
    }
  }, [userId])

  return !loading ? (
    <div className="min-h-[70vh] mx-6">
      {/* Store Info Banner */}
      {storeInfo && (
        <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
          {storeInfo.logo ? (
            <Image
              src={storeInfo.logo}
              alt={storeInfo.name}
              className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
              width={200}
              height={200}
            />
          ) : (
            <div className="size-32 sm:size-38 bg-slate-200 border-2 border-slate-100 rounded-md flex items-center justify-center text-slate-500">
              No logo
            </div>
          )}
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center gap-2 md:justify-start justify-center">
              <h1 className="text-3xl font-semibold text-slate-800">{storeInfo.name}</h1>
              {storeInfo.verificationStatus === 'approved' && (
                <BadgeCheck size={24} className="text-blue-500 shrink-0" title="Verified Seller" />
              )}
            </div>
            {storeInfo.username && (
              <div className="flex items-center gap-1 mt-1 md:justify-start justify-center">
                <p className="text-sm text-slate-500">@{storeInfo.username}</p>
                {storeInfo.verificationStatus === 'approved' && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Verified</span>
                )}
              </div>
            )}
            <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description}</p>
            <div className="space-y-2 text-sm text-slate-500 mt-4">
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                <span>{storeInfo.address}</span>
              </div>
              <div className="flex items-center">
                <MailIcon className="w-4 h-4 text-gray-500 mr-2" />
                <span>{storeInfo.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <Flag size={16} /> Report Store
              </button>

              {/* 1. Regular User (Not Owner, Not Admin) */}
              {storeInfo.userId !== userId && !isAdmin && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={isFollowLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition cursor-pointer ${
                      isFollowing
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                  <span className="text-sm font-semibold text-slate-500 ml-1">
                    {followersCount} {followersCount === 1 ? "Follower" : "Followers"}
                  </span>
                </>
              )}

              {/* 2. Admin View */}
              {isAdmin && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(!openDropdown)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                    >
                      Action <ChevronDown size={16} />
                    </button>

                    {openDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenDropdown(false)} 
                        />
                        <div className="absolute left-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
                          <button
                            onClick={() => handleAdminAction('remove')}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer border-b border-slate-100"
                          >
                            Delete Store
                          </button>
                          <button
                            onClick={() => handleAdminAction('suspend')}
                            className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 transition cursor-pointer border-b border-slate-100"
                          >
                            Suspend Store
                          </button>
                          {storeInfo.verificationStatus === 'approved' ? (
                            <button
                              onClick={() => handleAdminAction('unverify')}
                              className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 transition cursor-pointer border-b border-slate-100"
                            >
                              Unverify Store
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdminAction('verify')}
                              className="w-full text-left px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50 transition cursor-pointer border-b border-slate-100"
                            >
                              Verify Store
                            </button>
                          )}
                          
                          {/* Only show follow/unfollow if admin is not the store owner */}
                          {storeInfo.userId !== userId && (
                            <button
                              onClick={handleFollow}
                              disabled={isFollowLoading}
                              className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition cursor-pointer border-b border-slate-100"
                            >
                              {isFollowing ? "Unfollow Store" : "Follow Store"}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setShowManageProductsModal(true)
                              setOpenDropdown(false)
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                          >
                            Manage Product
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Followers count immediately after Action button */}
                  <span className="text-sm font-semibold text-slate-500 ml-1">
                    {followersCount} {followersCount === 1 ? "Follower" : "Followers"}
                  </span>
                </>
              )}

              {/* 3. Store Owner (if not Admin) */}
              {storeInfo.userId === userId && !isAdmin && (
                <span className="inline-flex items-center text-sm font-semibold text-slate-500 bg-slate-100/50 border border-slate-200 px-4 py-2 rounded-lg">
                  {followersCount} {followersCount === 1 ? "Follower" : "Followers"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Store</h2>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please describe the issue with this store..."
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReportStore}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Products Modal */}
      {showManageProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Manage Products for {storeInfo.name}</h2>
                <p className="text-sm text-slate-500">Delete seller products directly from this view.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowManageProductsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {products.length === 0 ? (
                <div className="text-slate-500 text-center py-10">No products found for this store.</div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="relative size-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border">
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                className="object-contain"
                                width={48}
                                height={48}
                              />
                            </div>
                            <span className="truncate max-w-[150px] sm:max-w-[200px]" title={product.name}>
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell max-w-xs truncate">
                          {product.description}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₦{formatPrice(product.price > 0 ? product.price : product.mrp)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-full transition cursor-pointer"
                            title="Delete Product"
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

            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowManageProductsModal(false)}
                className="px-6 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="max-w-7xl mx-auto mb-40">
        <h1 className="text-2xl mt-12">
          Shop <span className="text-slate-800 font-medium">Products</span>
        </h1>
        <div className="mt-5 grid grid-cols-3 md:grid-cols-4 gap-6 xl:gap-12 mx-auto">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  )
}
