'use client'
import { useEffect, useState } from "react"
import { Landmark, CheckCircle2, ShieldCheck, Loader2, Edit3, ArrowRight } from "lucide-react"
import Loading from "@/components/Loading"
import axios from "axios"
import toast from "react-hot-toast"
import { useAuth } from "@clerk/nextjs"

export default function PayoutPage() {
  const { getToken } = useAuth()
  const [banks, setBanks] = useState([])
  const [currentPayoutAccount, setCurrentPayoutAccount] = useState(null)
  
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [resolvedName, setResolvedName] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  
  // Settlement Preferences
  const [splitType, setSplitType] = useState("percentage")
  const [splitValue, setSplitValue] = useState(99)
  
  const [loading, setLoading] = useState(true)
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [verifyingBank, setVerifyingBank] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch saved payout details
  const fetchPayoutDetails = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get("/api/seller/payout-account", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCurrentPayoutAccount(data.payoutAccount)
      if (!data.payoutAccount) {
        setIsEditing(true)
      } else {
        setIsEditing(false)
        setBankCode(data.payoutAccount.bankCode || "")
        setAccountNumber(data.payoutAccount.accountNumber || "")
        setSplitType(data.payoutAccount.splitType || "percentage")
        setSplitValue(data.payoutAccount.splitValue || 99)
      }
    } catch (error) {
      console.error("Failed to load payout account:", error)
      toast.error("Failed to load payout account details")
    }
  }

  // Fetch banks from API
  const fetchBanksList = async () => {
    try {
      setLoadingBanks(true)
      const { data } = await axios.get("/api/banks")
      setBanks(data.banks || [])
    } catch (error) {
      console.error("Failed to fetch banks list:", error)
      toast.error("Failed to fetch bank list. Please reload page.")
    } finally {
      setLoadingBanks(false)
    }
  }

  // Resolve account name
  const handleVerifyBank = async () => {
    if (!bankCode) {
      return toast.error("Please select your bank")
    }
    if (accountNumber.length !== 10) {
      return toast.error("Account number must be 10 digits")
    }

    try {
      setVerifyingBank(true)
      setResolvedName("")
      setIsConfirmed(false)
      const token = await getToken()
      const { data } = await axios.post("/api/seller/verify-bank", {
        bankCode,
        accountNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResolvedName(data.accountName)
      toast.success("Account resolved successfully!")
    } catch (error) {
      console.error("Verification error:", error)
      toast.error(error?.response?.data?.error || "Failed to verify account details")
      setResolvedName("")
    } finally {
      setVerifyingBank(false)
    }
  }

  // Save payout details
  const handleSaveBank = async () => {
    if (!resolvedName) {
      return toast.error("Please verify account number first")
    }
    if (!isConfirmed) {
      return toast.error("Please confirm that the account name is correct")
    }

    const selectedBank = banks.find(b => b.code === bankCode)
    if (!selectedBank) {
      return toast.error("Selected bank is invalid")
    }

    try {
      setSaving(true)
      const token = await getToken()
      await axios.post("/api/seller/save-bank", {
        bankCode,
        bankName: selectedBank.name,
        accountNumber,
        splitType,
        splitValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Payout bank details saved successfully!")
      await fetchPayoutDetails()
      setIsEditing(false)
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error?.response?.data?.error || "Failed to save payout details")
    } finally {
      setSaving(false)
    }
  }

  // Automatically trigger verification when account number reaches 10 digits and bankCode is selected
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      handleVerifyBank()
    } else {
      setResolvedName("")
      setIsConfirmed(false)
    }
  }, [accountNumber, bankCode])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchPayoutDetails()
      await fetchBanksList()
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <Loading />

  return (
    <div className="text-slate-500 mb-28 max-w-4xl">
      <h1 className="text-2xl text-slate-500 mb-2">
        Payout <span className="text-slate-800 font-medium">Account Settings</span>
      </h1>
      <p className="text-sm text-slate-400 mb-8">
        Add or update your payout bank account. Funds generated from sales will be automatically settled into this verified account.
      </p>

      {/* Mode A: Show Saved Bank Details */}
      {!isEditing && currentPayoutAccount && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Landmark size={28} />
              </div>
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1 mb-1">
                  <ShieldCheck size={12} /> Verified Account
                </span>
                <h2 className="text-lg font-semibold text-slate-800">{currentPayoutAccount.accountName}</h2>
                <p className="text-sm text-slate-500">{currentPayoutAccount.bankName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBankCode(currentPayoutAccount.bankCode)
                setAccountNumber(currentPayoutAccount.accountNumber)
                setSplitType(currentPayoutAccount.splitType || "percentage")
                setSplitValue(currentPayoutAccount.splitValue || 99)
                setIsEditing(true)
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition flex items-center gap-2 max-sm:w-full justify-center cursor-pointer"
            >
              <Edit3 size={16} />
              Change Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">ACCOUNT NUMBER</p>
              <p className="text-lg font-semibold text-slate-700 mt-1">•••• •••• {currentPayoutAccount.accountNumber.slice(-4)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">SETTLEMENT PREFERENCE</p>
              <p className="text-lg font-semibold text-slate-700 mt-1">
                99% Payout Split
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">STATUS</p>
              <p className="text-lg font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 size={20} /> Active Payouts Enabled
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: Add / Edit Bank Form */}
      {isEditing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            {currentPayoutAccount ? "Update Bank Account" : "Link Your Bank Account"}
          </h2>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                disabled={loadingBanks}
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-slate-200 transition bg-white"
              >
                <option value="">Choose bank...</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number</label>
              <div className="relative mb-6">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter 10-digit account number"
                  value={accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ""); // allow digits only
                    setAccountNumber(val);
                  }}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-slate-200 transition"
                />
                {verifyingBank && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1.5 text-xs">
                    <Loader2 size={16} className="animate-spin" /> Verifying...
                  </span>
                )}
              </div>
            </div>



            {/* Resolved Name Confirmation Block */}
            {resolvedName && (
              <div className="p-5 border border-emerald-100 bg-emerald-50/50 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">ACCOUNT RESOLVED</p>
                    <p className="text-lg font-bold text-slate-800 mt-1 uppercase">{resolvedName}</p>
                    
                    <div className="mt-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="confirmName"
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="accent-slate-800 size-4 rounded cursor-pointer"
                      />
                      <label htmlFor="confirmName" className="text-sm text-slate-600 select-none cursor-pointer">
                        I confirm that the resolved account name matches my bank records
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
              {currentPayoutAccount && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveBank}
                disabled={saving || !resolvedName || !isConfirmed}
                className="px-8 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 active:scale-95 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    Link Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
