'use client'

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
    HomeIcon, 
    ShieldCheckIcon, 
    StoreIcon, 
    TicketPercentIcon, 
    BadgeCheck, 
    UserX, 
    UserMinus, 
    AlertTriangle,
    Megaphone,
    ChevronDown,
    LayoutTemplate,
    Sidebar
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"

const AdminSidebar = () => {

    const pathname = usePathname()
    const isAdActive = pathname.startsWith('/admin/advertisement')
    const [adDropdownOpen, setAdDropdownOpen] = useState(isAdActive)
    const [notificationCounts, setNotificationCounts] = useState({
        pendingStores: 0,
        pendingVerifications: 0,
        reports: 0,
        newOrders: 0,
        total: 0,
    })

    useEffect(() => {
        if (isAdActive) {
            setAdDropdownOpen(true)
        }
    }, [pathname, isAdActive])

    useEffect(() => {
        const fetchNotificationCounts = async () => {
            try {
                const res = await fetch('/api/admin/notifications/count', { credentials: 'include' })
                if (res.ok) {
                    const data = await res.json()
                    setNotificationCounts({
                        pendingStores: data.pendingStoreCount || 0,
                        pendingVerifications: data.pendingVerificationCount || 0,
                        reports: data.reportCount || 0,
                        newOrders: data.newOrderCount || 0,
                        total: data.total || 0,
                    })
                }
            } catch (error) {
                console.error('Failed to fetch admin notification counts:', error)
            }
        }

        fetchNotificationCounts()
        const interval = setInterval(fetchNotificationCounts, 15000)
        return () => clearInterval(interval)
    }, [])

    const sidebarLinks = [
        { name: 'Dashboard', href: '/admin', icon: HomeIcon, badge: notificationCounts.newOrders },
        { name: 'Stores', href: '/admin/stores', icon: StoreIcon },
        { name: 'Approve Store', href: '/admin/approve', icon: ShieldCheckIcon, badge: notificationCounts.pendingStores },
        { name: 'Verified Sellers', href: '/admin/verified-sellers', icon: BadgeCheck, badge: notificationCounts.pendingVerifications },
        { name: 'Suspended Users', href: '/admin/suspended', icon: UserX },
        { name: 'Deleted Users', href: '/admin/deleted', icon: UserMinus },
        { name: 'Reports', href: '/admin/reports', icon: AlertTriangle, badge: notificationCounts.reports },
        { name: 'Coupons', href: '/admin/coupons', icon: TicketPercentIcon  },
    ]

    return (
        <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <Image className="w-14 h-14 rounded-full" src={assets.gs_logo} alt="" width={80} height={80} />
                <p className="text-slate-700">Darté</p>
            </div>

            <div className="max-sm:mt-6 flex flex-col gap-0.5">
                {
                    sidebarLinks.map((link, index) => (
                        <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname === link.href && 'bg-slate-100 sm:text-slate-600'}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {link.badge > 0 && (
                                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                    {link.badge > 9 ? '9+' : link.badge}
                                </span>
                            )}
                            {pathname === link.href && <span className="absolute bg-green-500 right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>}
                        </Link>
                    ))
                }

                {/* Advertisement Collapsible Dropdown */}
                <div className="flex flex-col">
                    <button 
                        onClick={() => setAdDropdownOpen(!adDropdownOpen)} 
                        className={`relative flex items-center justify-between text-slate-500 hover:bg-slate-50 p-2.5 transition w-full ${isAdActive && 'bg-slate-50 text-slate-600 font-medium'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Megaphone size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">Advertisement</p>
                        </div>
                        <ChevronDown 
                            size={16} 
                            className={`max-sm:hidden mr-4 transition-transform duration-300 ${adDropdownOpen ? 'rotate-180' : ''}`} 
                        />
                    </button>

                    {/* Dropdown Options */}
                    {adDropdownOpen && (
                        <div className="flex flex-col bg-slate-50/50 pl-0 sm:pl-4 transition-all duration-300">
                            <Link 
                                href="/admin/advertisement/hero" 
                                className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition text-sm ${pathname === '/admin/advertisement/hero' && 'bg-slate-100/70 text-green-600 font-medium'}`}
                            >
                                <LayoutTemplate size={16} className="sm:ml-5" />
                                <p className="max-sm:hidden">Hero-Section</p>
                                {pathname === '/admin/advertisement/hero' && <span className="absolute bg-green-500 right-0 top-1.5 bottom-1.5 w-1 rounded-l"></span>}
                            </Link>

                            <Link 
                                href="/admin/advertisement/sidebar" 
                                className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition text-sm ${pathname === '/admin/advertisement/sidebar' && 'bg-slate-100/70 text-green-600 font-medium'}`}
                            >
                                <Sidebar size={16} className="sm:ml-5" />
                                <p className="max-sm:hidden">Sidebar</p>
                                {pathname === '/admin/advertisement/sidebar' && <span className="absolute bg-green-500 right-0 top-1.5 bottom-1.5 w-1 rounded-l"></span>}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminSidebar