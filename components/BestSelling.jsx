'use client'
import React, { useState, useEffect } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

const BestSelling = () => {
  const displayQuantity = 8
  const products = useSelector(state => state.product.list)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="px-6 my-30 max-w-6xl mx-auto">
      <Title
        title="Best Selling"
        description={`Showing ${
          products.length < displayQuantity ? products.length : displayQuantity
        } of ${products.length} products`}
        href="/shop"
      />
      <div className="mt-12 grid grid-cols-3 md:grid-cols-4 gap-6 xl:gap-12">
        {products
          .slice()
          .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
          .slice(0, displayQuantity)
          .map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
      </div>
    </div>
  )
}

export default BestSelling
