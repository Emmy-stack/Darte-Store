'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import axios from "axios"
import { useAuth } from "@clerk/nextjs"

export default function AdminReports() {
    const { getToken } = useAuth()
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchReports = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/admin/reports", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            setReports(data.reports || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to fetch reports")
        } finally {
            setLoading(false)
        }
    }
    
    const markNotificationsSeen = async () => {
        try {
            const token = await getToken()
            await axios.post("/api/admin/notifications/seen", {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
        } catch (error) {
            console.error("Failed to mark admin notifications as seen:", error)
        }
    }

    const handleDismiss = async (reportId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post("/api/admin/reports/dismiss", 
            { reportId }, 
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            toast.success(data.message || "Report dismissed successfully")
            fetchReports() // Refresh the list
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to dismiss report")
        }
    }

    const handleSuspend = async (storeId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post("/api/admin/stores/update", 
            { storeId, status: 'suspended' }, 
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            toast.success(data.message || "Seller suspended successfully")
            fetchReports() // Refresh the list
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to suspend store")
        }
    }

    useEffect(() => {
        fetchReports()
        markNotificationsSeen()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Reports</span></h1>

            {reports.length ? (
                <div className="flex flex-col gap-6 mt-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white border rounded-lg shadow-sm p-6 flex flex-col md:flex-row gap-6 max-w-4xl" >
                            {/* Store Info */}
                            <div className="flex-1">
                                <StoreInfo store={report.store} />
                            </div>

                            {/* Report details & Actions */}
                            <div className="md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 mb-4 text-slate-800">
                                    <p className="font-semibold text-red-700 text-xs uppercase tracking-wider mb-2">Reported Reason:</p>
                                    <p className="italic text-slate-700 bg-white p-3 rounded border border-red-100/50 shadow-sm text-sm">
                                        "{report.reason}"
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Reported on {new Date(report.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex gap-3 flex-wrap">
                                    <button onClick={() => toast.promise(handleSuspend(report.store.id), { loading: "Suspending store..." })} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition" >
                                        Suspend Seller
                                    </button>
                                    <button onClick={() => toast.promise(handleDismiss(report.id), { loading: "Dismissing report..." })} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-medium transition" >
                                        Dismiss Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No Pending Reports</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}
