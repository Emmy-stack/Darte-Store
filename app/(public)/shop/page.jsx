'use client'
import { Suspense, useState, useEffect } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, Store, ArrowRight, BadgeCheck, Mail, AlertCircle, ShoppingBag } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import Hero from "@/components/Hero"

function ShopContent() {
  // get query params ?search=abc
  const searchParams = useSearchParams()
  const search = searchParams.get('search')
  const router = useRouter()

  const products = useSelector(state => state.product.list)
  const [matchingSellers, setMatchingSellers] = useState([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!search) {
      setMatchingSellers([])
      return
    }

    const fetchSellers = async () => {
      setLoadingSellers(true)
      try {
        const res = await fetch(`/api/store/search?q=${encodeURIComponent(search)}`)
        if (res.ok) {
          const data = await res.json()
          setMatchingSellers(data.stores || [])
        } else {
          setMatchingSellers([])
        }
      } catch (err) {
        console.error("Error fetching matching stores:", err)
        setMatchingSellers([])
      } finally {
        setLoadingSellers(false)
      }
    }

    fetchSellers()
  }, [search])

  const filteredProducts = search
    ? products.filter(product => {
      const query = search.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      )
    })
    : products

  const hasSellers = matchingSellers.length > 0
  const hasProducts = filteredProducts.length > 0

  if (!mounted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-500 font-medium">
        Loading shop...
      </div>
    )
  }

  return (
    <div>
      <Hero />
      <div className="min-h-[70vh] mx-6">
        <div className="max-w-7xl mx-auto py-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1
            onClick={() => router.push('/shop')}
            className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer transition hover:text-slate-700 font-semibold"
          >
            {search && <MoveLeftIcon size={20} className="text-slate-400" />}
            All <span className="text-slate-800 font-bold">Products</span>
          </h1>

          {search && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Filtering by:</span>
              <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200/60 px-4 py-1.5 rounded-full font-semibold shadow-sm">
                &ldquo;{search}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Loading Sellers Section */}
        {search && loadingSellers && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 animate-pulse">
              <Store size={18} className="text-slate-400" />
              Searching for stores...
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-full flex-shrink-0" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sellers Results Section */}
        {search && !loadingSellers && hasSellers && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Store size={20} className="text-green-600" />
              Matching Sellers <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">{matchingSellers.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {matchingSellers.map((seller) => (
                <div
                  key={seller.id}
                  onClick={() => router.push(`/shop/${seller.username}`)}
                  className="group relative bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:shadow-xl hover:border-green-200 hover:-translate-y-1 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={seller.logo || "/default-avatar.png"}
                        alt={seller.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 group-hover:border-green-300 transition-colors duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                        <Store size={10} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 group-hover:text-green-600 transition-colors duration-200 truncate flex items-center gap-1.5">
                        {seller.name}
                        {seller.verificationStatus === "approved" && (
                          <BadgeCheck size={16} className="text-blue-500 fill-blue-500/10 flex-shrink-0" />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">@{seller.username}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                        <Mail size={12} className="flex-shrink-0" />
                        <span className="truncate">{seller.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 group-hover:bg-green-50 text-slate-400 group-hover:text-green-600 transition-all duration-300 flex-shrink-0">
                    <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Results Section */}
        <div className="mb-24">
          {search && (hasSellers || hasProducts) && (
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ShoppingBag size={20} className="text-slate-600" />
              Products {hasProducts && <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">{filteredProducts.length}</span>}
            </h2>
          )}

          {hasProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 xl:gap-8 mx-auto">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            // Zero products found (and if we aren't loading and have no sellers)
            !loadingSellers && !hasSellers && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
                <div className="p-4 bg-slate-50 rounded-full mb-4 text-slate-400 animate-bounce">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  No matches found
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  We couldn&apos;t find any products or sellers matching &ldquo;{search}&rdquo;. Try checking spelling or another term.
                </p>
                <button
                  onClick={() => router.push('/shop')}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-full shadow transition-all duration-200"
                >
                  Clear search
                </button>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  </div>
  )
}

export default function Shop() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-slate-500 font-medium">Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  )
}
