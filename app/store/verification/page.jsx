'use client'
import { useEffect, useState } from "react"
import { ShieldCheck, Hourglass, Ban, ArrowRight, ShieldAlert } from "lucide-react"
import Loading from "@/components/Loading"
import axios from "axios"
import toast from "react-hot-toast"
import { useAuth } from "@clerk/nextjs"

export default function VerificationPage() {
  const { getToken } = useAuth()
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get("/api/store/seller", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVerificationStatus(data.verificationStatus || "none")
    } catch (error) {
      console.error("Failed to fetch seller status:", error)
      toast.error(error?.response?.data?.error || "Failed to load verification status")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    try {
      setSubmitting(true)
      const token = await getToken()
      const { data } = await axios.post("/api/store/apply-verification", {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(data.message || "Application submitted successfully!")
      setVerificationStatus("pending")
    } catch (error) {
      console.error("Failed to apply for verification:", error)
      toast.error(error?.response?.data?.error || "Failed to apply for verification")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) return <Loading />

  return (
    <div className="text-slate-500 mb-28 max-w-4xl">
      <h1 className="text-2xl text-slate-500 mb-2">
        Store <span className="text-slate-800 font-medium">Verification</span>
      </h1>
      <p className="text-sm text-slate-400 mb-8">
        Get verified to unlock special store benefits, show a verified badge to customers, and rank higher in search results.
      </p>

      {verificationStatus === "approved" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-xs">
          <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck size={36} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-semibold text-slate-800">Your Store is Verified!</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Congratulations! Your store is fully verified and active. Customers can see your verified status, and your products are discoverable across the platform.
            </p>
          </div>
        </div>
      )}

      {verificationStatus === "pending" && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-xs">
          <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Hourglass size={32} className="animate-pulse" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-semibold text-slate-800">Verification Pending</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Your application is currently under review by our admin team. This process typically takes 24-48 hours. We'll update your dashboard status as soon as the review is complete.
            </p>
          </div>
        </div>
      )}

      {verificationStatus === "rejected" && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-xs">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Ban size={32} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-semibold text-slate-800">Verification Rejected</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Your verification application was not approved. You can re-apply for verification after addressing any issues. If you believe this was a mistake, reach out to our support team at <span className="font-semibold text-slate-700">support@darte.com</span>.
            </p>
            <button
              onClick={handleApply}
              disabled={submitting}
              className="mt-4 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Submitting..." : "Re-apply for verification"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {(verificationStatus === "none" || !verificationStatus) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex gap-4 items-center">
              <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Not Verified</h2>
                <p className="text-sm text-slate-600 mt-1 max-w-md">
                  Your store is currently not verified. Apply for verification to boost customer trust and increase search visibility. To Apply, your store must have 1000+ followers and active product listings.
                </p>
              </div>
            </div>
            <button
              onClick={handleApply}
              disabled={submitting}
              className="w-full md:w-auto px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Submitting..." : "Apply for verification"}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t">
            <div>
              <h3 className="font-medium text-slate-800 mb-1">1. Customer Trust</h3>
              <p className="text-xs text-slate-500 leading-5">
                Verified badges on your products and shop page will reassure buyers and boost your conversion rates.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">2. Search Visibility</h3>
              <p className="text-xs text-slate-500 leading-5">
                Our algorithm gives priority ranking to verified stores in searches, catalogs, and collections.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">3. Priority Support</h3>
              <p className="text-xs text-slate-500 leading-5">
                Get dedicated seller assistance from our support team to help resolve any order or delivery issues.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
