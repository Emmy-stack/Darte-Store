'use client'
import StoreInfo from '@/components/admin/StoreInfo'
import Loading from '@/components/Loading'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function VerifiedSellers() {
  const { getToken } = useAuth()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStores = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/admin/verification', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Sort: pending first, then approved, then rejected
      const sorted = (data.stores || []).sort((a, b) => {
        const order = { pending: 0, approved: 1, rejected: 2, none: 3 }
        return (order[a.verificationStatus] ?? 4) - (order[b.verificationStatus] ?? 4)
      })
      setStores(sorted)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to fetch stores')
    } finally {
      setLoading(false)
    }
  }

  const markNotificationsSeen = async () => {
    try {
      const token = await getToken()
      await axios.post('/api/admin/notifications/seen', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Failed to mark admin notifications as seen:', error)
    }
  }

  const handleAction = async (storeId, action) => {
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/admin/verification', { storeId, action }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(data.message)
      fetchStores()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Action failed')
    }
  }

  useEffect(() => {
    fetchStores()
    markNotificationsSeen()
  }, [])

  return !loading ? (
    <div className="text-slate-500 mb-28 max-w-4xl">
      <h1 className="text-2xl text-slate-500 mb-2">
        Verified <span className="text-slate-800 font-medium">Sellers</span>
      </h1>

      {stores.length ? (
        <div className="flex flex-col gap-4 mt-4">
          {stores.map((store) => (
            <div key={store.id} className="bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl">
              {/* Store Info */}
              <StoreInfo store={store} />

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                {store.verificationStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => toast.promise(handleAction(store.id, 'verify'), { loading: 'Verifying...' })}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => toast.promise(handleAction(store.id, 'reject'), { loading: 'Rejecting...' })}
                      className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
                {store.verificationStatus === 'approved' && (
                  <button
                    onClick={() => toast.promise(handleAction(store.id, 'unverify'), { loading: 'Removing verification...' })}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
                  >
                    Unverify
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-80">
          <h1 className="text-3xl text-slate-400 font-medium">No Verification Requests</h1>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  )
}
