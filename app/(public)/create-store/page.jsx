'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"
import { set } from "date-fns"

export default function CreateStore() {

    const {user} = useUser()
    const router = useRouter()
    const {getToken} = useAuth()

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")

    const [storeInfo, setStoreInfo] = useState({
        name: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: ""
    })
    const [errors, setErrors] = useState({})

    // Flutterwave Bank Verification details
    const [banks, setBanks] = useState([])
    const [bankCode, setBankCode] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [resolvedName, setResolvedName] = useState("")
    const [isConfirmed, setIsConfirmed] = useState(false)
    const [verifyingBank, setVerifyingBank] = useState(false)
    
    // Settlement Preferences
    const [splitType, setSplitType] = useState("percentage")
    const [splitValue, setSplitValue] = useState(98)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const onChangeHandler = (e) => {
        const { name, value } = e.target
        setStoreInfo({ ...storeInfo, [name]: value })
        setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    const isStoreNameComplete = storeInfo.name.trim() !== ''
    const isDescriptionComplete = isStoreNameComplete && storeInfo.description.trim() !== ''
    const isEmailComplete = isDescriptionComplete && storeInfo.email.trim() !== ''
    const isContactComplete = isEmailComplete && storeInfo.contact.trim() !== ''
    const isAddressComplete = isContactComplete && storeInfo.address.trim() !== ''

    const validateStoreInfo = () => {
        const nextErrors = {}

        if (!storeInfo.name.trim()) nextErrors.name = 'Store name is required.'
        if (!storeInfo.description.trim()) nextErrors.description = 'Store description is required.'
        if (!storeInfo.email.trim()) nextErrors.email = 'Store email is required.'
        else if (!emailRegex.test(storeInfo.email)) nextErrors.email = 'Enter a valid email address.'
        if (!storeInfo.contact.trim()) nextErrors.contact = 'Contact number is required.'
        if (!storeInfo.address.trim()) nextErrors.address = 'Store address is required.'
        if (!storeInfo.image) nextErrors.image = 'Store logo is required.'

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const fetchSellerStatus = async () => {
        const token = await getToken()
        try {
            const {data} = await axios.get("/api/store/seller", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        if(['approved', 'rejected', 'pending'].includes(data.status)){
            setStatus(data.status)
            setAlreadySubmitted(true)
            switch (data.status) {
                case "approved":
                    setMessage("Your store has been approved, you can now add products to your store from dashboard")
                    setTimeout(() =>router.push("/store"), 5000)
                    break;
                case "rejected":
                    setMessage("Your store request has been rejected, contact the admin for more details")
                    break;
                case "pending":
                    setMessage("Your store request is pending, please wait for admin to approve your store")
                    break;
                default:
                    break;
            }
        }else{
            setAlreadySubmitted(false)
        }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleVerifyBank = async () => {
        if (!bankCode) return
        if (accountNumber.length !== 10) return

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
            toast.success("Bank account resolved!")
        } catch (error) {
            console.error("Verification error:", error)
            toast.error(error?.response?.data?.error || "Failed to verify bank details")
            setResolvedName("")
        } finally {
            setVerifyingBank(false)
        }
    }

    useEffect(() => {
        if (accountNumber.length === 10 && bankCode) {
            handleVerifyBank()
        } else {
            setResolvedName("")
            setIsConfirmed(false)
        }
    }, [accountNumber, bankCode])

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if(!user){
            return toast('Please login to continue')
        }

        if (!validateStoreInfo()) {
            return toast.error('Please complete all required fields before submitting.')
        }

        if (!bankCode || accountNumber.length !== 10) {
            return toast.error('Please enter complete bank details.')
        }

        if (!resolvedName) {
            return toast.error('Please verify your bank details first.')
        }

        if (!isConfirmed) {
            return toast.error('Please confirm that the bank account name is correct.')
        }

        try {
            const token = await getToken()
            const selectedBank = banks.find(b => b.code === bankCode)
            const formData = new FormData()
            formData.append("name", storeInfo.name)
            formData.append("description", storeInfo.description)
            formData.append("email", storeInfo.email)
            formData.append("contact", storeInfo.contact)
            formData.append("address", storeInfo.address)
            formData.append("image", storeInfo.image)
            formData.append("bankCode", bankCode)
            formData.append("bankName", selectedBank?.name || "")
            formData.append("accountNumber", accountNumber)
            formData.append("splitType", splitType)
            formData.append("splitValue", String(splitValue))

            const {data} = await axios.post("/api/store/create", formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            toast.success(data.message)
            await fetchSellerStatus()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        fetchSellerStatus()
        
        // Fetch bank list
        axios.get("/api/banks")
            .then(res => setBanks(res.data.banks || []))
            .catch(err => console.error("Failed to load banks list", err))
    }, [])

    if (!user){
        return(
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">Please <span className="text-slate-500">login</span> to continue</h1>
            </div>
        )
    }

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Submitting data..." })} className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500">
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl ">Add Your <span className="text-slate-800 font-medium">Store</span></h1>
                            <p className="max-w-lg">To become a seller on Darté, submit your store details for review. Your store will be activated after admin verification.</p>
                        </div>

                        <label className="mt-10 cursor-pointer">
                            Store Logo
                            <Image src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area} className="rounded-lg mt-2 h-16 w-auto" alt="" width={150} height={100} />
                            <input type="file" accept="image/*" onChange={(e) => { setStoreInfo({ ...storeInfo, image: e.target.files[0] }); setErrors((prev) => ({ ...prev, image: '' })) }} hidden />
                        </label>
                        {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}

                        <p>Name</p>
                        <input
                            name="name"
                            onChange={onChangeHandler}
                            value={storeInfo.name}
                            type="text"
                            placeholder="Enter your store name"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

                        <p>Description</p>
                        <textarea
                            name="description"
                            onChange={onChangeHandler}
                            value={storeInfo.description}
                            rows={5}
                            placeholder={isStoreNameComplete ? "Enter your store description" : "Complete store name first"}
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                            disabled={!isStoreNameComplete}
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}

                        <p>Email</p>
                        <input
                            name="email"
                            onChange={onChangeHandler}
                            value={storeInfo.email}
                            type="email"
                            placeholder={isDescriptionComplete ? "Enter your store email" : "Complete description first"}
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            disabled={!isDescriptionComplete}
                        />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

                        <p>Contact Number</p>
                        <input
                            name="contact"
                            onChange={onChangeHandler}
                            value={storeInfo.contact}
                            type="text"
                            placeholder={isEmailComplete ? "Enter your store contact number" : "Complete email first"}
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            disabled={!isEmailComplete}
                        />
                        {errors.contact && <p className="text-red-500 text-sm">{errors.contact}</p>}

                        <p>Address (Enter University Address if applicable)</p>
                        <textarea
                            name="address"
                            onChange={onChangeHandler}
                            value={storeInfo.address}
                            rows={5}
                            placeholder={isContactComplete ? "Enter your store address" : "Complete contact first"}
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                            disabled={!isContactComplete}
                        />
                        {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}

                        {/* Payout Bank details */}
                        <div className="w-full max-w-lg mt-8 pt-8 border-t border-slate-200">
                            <h3 className="text-xl font-medium text-slate-800 mb-2">Payout Bank Details</h3>
                            <p className="text-sm text-slate-400 mb-6">Enter the bank details where you wish to receive settlements from your store sales. Details will be verified instantly.</p>
                            
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="mb-1 text-sm font-semibold">Select Bank</p>
                                    <select
                                        value={bankCode}
                                        onChange={(e) => setBankCode(e.target.value)}
                                        disabled={!isAddressComplete}
                                        className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
                                    >
                                        <option value="">Choose bank...</option>
                                        {banks.map((bank) => (
                                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <p className="mb-1 text-sm font-semibold">Account Number</p>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            maxLength={10}
                                            placeholder="Enter 10-digit account number"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                                            disabled={!bankCode}
                                            className="w-full border border-slate-300 rounded p-2 outline-none"
                                        />
                                        {verifyingBank && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                                Verifying...
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-1 text-sm font-semibold text-slate-700">Settlement Split</p>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                                        Sellers receive <span className="font-semibold text-slate-800">98%</span> of all successful order payments. The platform takes a 2% commission.
                                    </div>
                                </div>

                                {resolvedName && (
                                    <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-lg animate-in fade-in duration-200">
                                        <p className="text-xs text-slate-400 font-semibold uppercase">Account Owner Name</p>
                                        <p className="text-lg font-bold text-slate-800 uppercase mt-1">{resolvedName}</p>
                                        
                                        <div className="mt-3 flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                id="confirmNameOnboarding"
                                                checked={isConfirmed}
                                                onChange={(e) => setIsConfirmed(e.target.checked)}
                                                className="accent-slate-800 size-4 rounded mt-0.5 cursor-pointer"
                                            />
                                            <label htmlFor="confirmNameOnboarding" className="text-xs text-slate-600 select-none cursor-pointer">
                                                I confirm that the resolved account name matches my bank records
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition ">Submit</button>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center">
                    <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">{message}</p>
                    {status === "approved" && <p className="mt-5 text-slate-400">redirecting to dashboard in <span className="font-semibold">5 seconds</span></p>}
                </div>
            )}
        </>
    ) : (<Loading />)
}