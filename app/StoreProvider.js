'use client'
import { useRef, useEffect } from 'react'
import { Provider, useDispatch } from 'react-redux'
import { makeStore } from '../lib/store'
import { setProduct } from '@/lib/features/product/productSlice'
import { setCart } from '@/lib/features/cart/cartSlice'
import { setAddresses } from '@/lib/features/address/addressSlice'
import { setRatings } from '@/lib/features/rating/ratingSlice'

function ProductInitializer({ children }) {
  const dispatch = useDispatch()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const fetchProducts = async () => {
      try {
        const cached = sessionStorage.getItem('products')
        if (cached) {
          dispatch(setProduct(JSON.parse(cached)))
          return
        }
        const response = await fetch('/api/products')
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }
        const data = await response.json()
        const products = data.products || []
        dispatch(setProduct(products))
        sessionStorage.setItem('products', JSON.stringify(products))
      } catch (error) {
        console.error('Error initializing products:', error)
      }
    }

    fetchProducts()
    // fetch cart for logged in user
    const fetchCart = async () => {
      try {
        const resp = await fetch('/api/cart', { credentials: 'include' })
        if (!resp.ok) return
        const data = await resp.json()
        dispatch(setCart(data.cart || {}))
      } catch (err) {
        console.error('Failed to fetch cart', err)
      }
    }
    
    const fetchAddresses = async () => {
      try {
        const resp = await fetch('/api/address', { credentials: 'include' })
        if (!resp.ok) return
        const data = await resp.json()
        dispatch(setAddresses(data.addresses || []))
      } catch (err) {
        console.error('Failed to fetch addresses', err)
      }
    }

    const fetchRatings = async () => {
      try {
        const resp = await fetch('/api/ratings', { credentials: 'include' })
        if (!resp.ok) return
        const data = await resp.json()
        dispatch(setRatings(data.ratings || []))
      } catch (err) {
        console.error('Failed to fetch ratings', err)
      }
    }

    fetchCart()
    fetchAddresses()
    fetchRatings()
  }, [dispatch])

  return children
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <ProductInitializer>{children}</ProductInitializer>
    </Provider>
  )
}