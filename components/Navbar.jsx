'use client'
import { PackageIcon, Search, ShoppingCart, Menu, X, LogOut, Store, Mail, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useUser, useClerk } from "@clerk/nextjs";

const Navbar = () => {
  const { user } = useUser();
  const { openSignIn, signOut, openUserProfile } = useClerk();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  const [canCreateStore, setCanCreateStore] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const contactRef = useRef(null);
  const cartCount = useSelector(state => state.cart.total);
  const cartBadgeRef = useRef(null);
  const prevCountRef = useRef(cartCount);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedOutsideDesktop = !desktopMenuRef.current || !desktopMenuRef.current.contains(e.target);
      const clickedOutsideMobile = !mobileMenuRef.current || !mobileMenuRef.current.contains(e.target);
      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setMenuOpen(false);
      }
      if (contactRef.current && !contactRef.current.contains(e.target)) {
        setContactOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuNav = useCallback((path) => {
    setMenuOpen(false);
    setContactOpen(false);
    router.push(path);
  }, [router]);

  const emailContactLink = 'mailto:darte.universe@gmail.com';
  const whatsappContactLink = 'https://wa.me/2347041545267';
  const telegramContactLink = 'https://t.me/+2347047673903';

  // Animate the cart badge whenever the count changes
  useEffect(() => {
    if (cartCount !== prevCountRef.current && cartBadgeRef.current) {
      cartBadgeRef.current.classList.remove('animate-cart-ping');
      // Force reflow to restart animation
      void cartBadgeRef.current.offsetWidth;
      cartBadgeRef.current.classList.add('animate-cart-ping');
      prevCountRef.current = cartCount;
    }
  }, [cartCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${search}`);
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const cachedStatus = sessionStorage.getItem('userStatus');
        if (cachedStatus) {
          const status = JSON.parse(cachedStatus);
          setIsSeller(status.isSeller);
          setIsAdmin(status.isAdmin);
          setCanCreateStore(status.canCreateStore);
          return;
        }
        
        const [sellerRes, adminRes] = await Promise.all([
          fetch('/api/store/seller', { credentials: 'include' }),
          fetch('/api/admin/is-admin', { credentials: 'include' }),
        ]);

        let sellerStatus = false;
        let adminStatus = false;
        let createStoreStatus = false;

        if (sellerRes.ok) {
          const sellerData = await sellerRes.json();
          sellerStatus = sellerData.status === 'approved';
        } else {
          const sellerData = await sellerRes.json().catch(() => ({}));
          createStoreStatus = sellerRes.status === 404 || sellerData?.error === 'Store not found';
        }

        if (adminRes.ok) {
          const adminData = await adminRes.json();
          adminStatus = adminData.isAdmin === true;
        }
        
        setIsSeller(sellerStatus);
        setIsAdmin(adminStatus);
        setCanCreateStore(createStoreStatus);
        
        const statusToCache = { isSeller: sellerStatus, isAdmin: adminStatus, canCreateStore: createStoreStatus };
        sessionStorage.setItem('userStatus', JSON.stringify(statusToCache));
      } catch (error) {
        setIsSeller(false);
        setIsAdmin(false);
        setCanCreateStore(false);
      }
    };

    if (user) {
      fetchStatus();
    } else {
      setIsSeller(false);
      setIsAdmin(false);
      setCanCreateStore(false);
      sessionStorage.removeItem('userStatus');
    }
  }, [user]);
  
  useEffect(() => {
    if (isSeller) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('/api/store/notifications/count');
          if (res.ok) {
            const data = await res.json();
            setNotificationCount(data.count || 0);
          }
        } catch (e) {
          console.error("Error fetching navbar notifications:", e);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotificationCount(0);
    }
  }, [isSeller]);

  useEffect(() => {
    if (isAdmin) {
      const fetchAdminNotifications = async () => {
        try {
          const res = await fetch('/api/admin/notifications/count', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setAdminNotificationCount(data.total || 0);
          }
        } catch (e) {
          console.error("Error fetching admin notification count:", e);
        }
      };
      fetchAdminNotifications();
      const interval = setInterval(fetchAdminNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setAdminNotificationCount(0);
    }
  }, [isAdmin]);

  return (
    <nav className="relative bg-white">
      <div className="mx-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all gap-4">

          {/* Logo */}
          <Link href="/" className="relative text-4xl font-semibold text-slate-700 flex-shrink-0">
            <span className="text-green-600">Dart</span>é
            <span className="text-green-600 text-5xl leading-0">.</span>
            <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
              plus
            </p>
          </Link>

          {/* Search bar for smaller/mobile devices (< sm) - placed in between Darté and user profile */}
          <form
            onSubmit={handleSearch}
            className="flex sm:hidden items-center flex-1 max-w-[240px] text-xs gap-1.5 bg-slate-200/40 px-3 py-2 rounded-full border border-slate-200/40 hover:bg-slate-200/50 focus-within:bg-white focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100 transition-all duration-300"
          >
            <Search size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <input
              className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required
            />
          </form>

          {/* Search bar for intermediate devices (sm to xl) - placed in between Darté and Home */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex xl:hidden items-center w-52 md:w-64 lg:w-80 text-xs md:text-sm gap-2 bg-slate-200/40 px-4 py-2.5 rounded-full border border-slate-200/40 hover:bg-slate-200/50 focus-within:bg-white focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100 transition-all duration-300"
          >
            <Search size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <input
              className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
              type="text"
              placeholder="Search products, stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required
            />
          </form>

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
            {!user && <Link href="/">Home</Link>}
            <Link href="/shop">Shop</Link>
            <div className="relative" ref={contactRef}>
              <button
                type="button"
                onClick={() => setContactOpen((prev) => !prev)}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition"
              >
                Contact
              </button>
              {contactOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50">
                  <a href={emailContactLink} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <Mail size={16} className="text-slate-500" />
                    Email Us
                  </a>
                  <a href={whatsappContactLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <MessageSquare size={16} className="text-slate-500" />
                    WhatsApp
                  </a>
                  <a href={telegramContactLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <MessageSquare size={16} className="text-slate-500" />
                    Telegram
                  </a>
                </div>
              )}
            </div>

            {/* Desktop Search Bar (only for >= xl) */}
            <form
              onSubmit={handleSearch}
              className="hidden xl:flex items-center w-96 text-sm gap-2 bg-slate-200/40 px-4 py-3 rounded-full border border-slate-200/40 hover:bg-slate-200/50 focus-within:bg-white focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100 transition-all duration-300"
            >
              <Search size={18} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <input
                className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400 dark:text-slate-300 dark:placeholder:text-slate-500"
                type="text"
                placeholder="Search products, stores, or usernames"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                required
              />
            </form>

            <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
              <ShoppingCart size={18} />
              Cart
              <span ref={cartBadgeRef} className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full flex items-center justify-center transition-transform">
                {cartCount}
              </span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="relative px-4 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition"
              >
                Admin
                {adminNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                  </span>
                )}
              </Link>
            )}

            {isSeller && (
              <Link
                href="/store"
                className="relative px-4 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition"
              >
                Store
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Link>
            )}

            {canCreateStore && (
              <Link
                href="/create-store"
                className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
              >
                Sell
              </Link>
            )}

            {!user ? (
              <button
                onClick={() => openSignIn({ forceRedirectUrl: '/shop' })}
                className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full"
              >
                Login
              </button>
            ) : (
              <div className="relative" ref={desktopMenuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                  aria-label="Menu"
                >
                  {menuOpen ? <X size={22} className="text-slate-700" /> : <Menu size={22} className="text-slate-700" />}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || user.firstName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>

                    {isAdmin && (
                      <button onClick={() => handleMenuNav('/admin')} className="relative flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <PackageIcon size={16} className="text-slate-500" />
                        Admin Dashboard
                        {adminNotificationCount > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-2.5 min-w-[0.75rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white font-semibold">
                            {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                          </span>
                        )}
                      </button>
                    )}
                    {isSeller && (
                      <button onClick={() => handleMenuNav('/store')} className="relative flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Store size={16} className="text-slate-500" />
                        Store Dashboard
                        {notificationCount > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                        )}
                      </button>
                    )}
                    <button onClick={() => handleMenuNav('/orders')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <PackageIcon size={16} className="text-slate-500" />
                      My Orders
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openUserProfile();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User size={16} className="text-slate-500" />
                      Manage Account
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button onClick={() => { setMenuOpen(false); signOut(); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile User Button */}
          <div className="sm:hidden">
            {user ? (
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                  aria-label="Menu"
                >
                  {menuOpen ? <X size={20} className="text-slate-700" /> : <Menu size={20} className="text-slate-700" />}
                  {!menuOpen && notificationCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || user.firstName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>

                    {isAdmin && (
                      <button onClick={() => handleMenuNav('/admin')} className="relative flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <PackageIcon size={16} className="text-slate-500" />
                        Admin Dashboard
                        {adminNotificationCount > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-2.5 min-w-[0.75rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white font-semibold">
                            {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                          </span>
                        )}
                      </button>
                    )}
                    {isSeller && (
                      <button onClick={() => handleMenuNav('/store')} className="relative flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Store size={16} className="text-slate-500" />
                        Store Dashboard
                        {notificationCount > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                        )}
                      </button>
                    )}
                    {canCreateStore && (
                      <button onClick={() => handleMenuNav('/create-store')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <PackageIcon size={16} className="text-slate-500" />
                        Create Store
                      </button>
                    )}
                    <button onClick={() => handleMenuNav('/cart')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <ShoppingCart size={16} className="text-slate-500" />
                      Cart
                    </button>
                    <button onClick={() => handleMenuNav('/orders')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <PackageIcon size={16} className="text-slate-500" />
                      My Orders
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openUserProfile();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User size={16} className="text-slate-500" />
                      Manage Account
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button onClick={() => { setMenuOpen(false); signOut(); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openSignIn({ forceRedirectUrl: '/shop' })}
                className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
      <hr className="border-gray-300" />
    </nav>
  );
};

export default Navbar;
