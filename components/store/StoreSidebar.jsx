'use client'
import { usePathname } from "next/navigation"
import { HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, PencilIcon, XIcon, ShieldCheck, Landmark } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"

const StoreSidebar = ({storeInfo, setStoreInfo}) => {

    const pathname = usePathname()
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [notificationCount, setNotificationCount] = useState(0)
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        contact: '',
        username: '',
        logoFile: null,
    })

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.get('/api/store/notifications/count')
                setNotificationCount(res.data.count || 0)
            } catch (error) {
                console.error("Failed to fetch notification count in sidebar:", error)
            }
        }
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (storeInfo) {
            setFormState({
                name: storeInfo.name || '',
                email: storeInfo.email || '',
                contact: storeInfo.contact || '',
                username: storeInfo.username || '',
                logoFile: null,
            })
        }
    }, [storeInfo])

    const openEditModal = () => {
        if (!storeInfo) return
        setIsEditing(true)
    }

    const closeEditModal = () => {
        setIsEditing(false)
    }

    const handleInputChange = (event) => {
        const { name, value } = event.target
        setFormState((prev) => ({ ...prev, [name]: value }))
    }

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null
        setFormState((prev) => ({ ...prev, logoFile: file }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!formState.name.trim() || !formState.email.trim() || !formState.contact.trim()) {
            toast.error('Name, email, and phone number are required')
            return
        }

        try {
            setIsSaving(true)
            const body = new FormData()
            body.append('name', formState.name.trim())
            body.append('email', formState.email.trim())
            body.append('contact', formState.contact.trim())
            if (formState.logoFile) {
                body.append('logo', formState.logoFile)
            }

            const { data } = await axios.post('/api/store/update', body)
            setStoreInfo(data.store)
            toast.success('Profile updated successfully')
            setIsEditing(false)
        } catch (error) {
            console.error(error)
            toast.error(error?.response?.data?.error || 'Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    const sidebarLinks = [
        { name: 'Dashboard', href: '/store', icon: HomeIcon },
        { name: 'Add Product', href: '/store/add-product', icon: SquarePlusIcon },
        { name: 'Manage Product', href: '/store/manage-product', icon: SquarePenIcon },
        { name: 'Orders', href: '/store/orders', icon: LayoutListIcon, badge: true },
        { name: 'Payout Account', href: '/store/payout', icon: Landmark },
        { name: 'Verification', href: '/store/verification', icon: ShieldCheck },
    ]

    return (
        <>
            <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
                <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                    <button type="button" onClick={openEditModal} className="rounded-full overflow-hidden border border-slate-200 shadow-sm transition hover:shadow-lg focus:outline-none">
                        <Image className="w-14 h-14 rounded-full object-cover" src={storeInfo?.logo || '/no-image.png'} alt={storeInfo?.name || 'Seller logo'} width={80} height={80} />
                    </button>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                            <button type="button" onClick={openEditModal} className="text-slate-700 font-medium hover:text-slate-900 transition">
                                {storeInfo?.name}
                            </button>
                            <PencilIcon onClick={openEditModal} size={16} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
                        </div>
                        {storeInfo?.username && (
                            <button type="button" onClick={openEditModal} className="text-xs text-slate-400 hover:text-slate-600 transition">
                                @{storeInfo.username}
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-sm:mt-6">
                    {
                        sidebarLinks.map((link, index) => (
                            <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname === link.href && 'bg-slate-100 sm:text-slate-600'}`}>
                                <div className="relative flex items-center">
                                    <link.icon size={18} className="sm:ml-5" />
                                    {link.badge && notificationCount > 0 && (
                                        <span className="sm:hidden absolute -top-1.5 -right-1.5 flex h-2 w-2">
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                                <p className="max-sm:hidden">{link.name}</p>
                                {link.badge && notificationCount > 0 && (
                                    <span className="max-sm:hidden ml-auto mr-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center">
                                        {notificationCount}
                                    </span>
                                )}
                                {pathname === link.href && <span className="absolute bg-green-500 right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                            </Link>
                        ))
                    }
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Edit Store Profile</h2>
                                <p className="text-sm text-slate-500">Update your store name, logo, email, and phone number.</p>
                            </div>
                            <button type="button" onClick={closeEditModal} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Store name</label>
                                <input name="name" value={formState.name} onChange={handleInputChange} className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-slate-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Username</label>
                                <input name="username" value={formState.username} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input name="email" type="email" value={formState.email} onChange={handleInputChange} className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-slate-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Phone number</label>
                                <input name="contact" value={formState.contact} onChange={handleInputChange} className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-slate-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Profile picture</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2 w-full text-sm text-slate-500" />
                                {formState.logoFile && <p className="mt-2 text-xs text-slate-500">Selected file: {formState.logoFile.name}</p>}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeEditModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                                    {isSaving ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default StoreSidebar