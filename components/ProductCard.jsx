'use client'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import formatPrice from '@/lib/formatPrice'

const ProductCard = ({ product }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

  // calculate the average rating of the product
  const rating = product.rating && product.rating.length > 0
    ? Math.round(
        product.rating.reduce((acc, curr) => acc + curr.rating, 0) /
          product.rating.length
      )
    : 0
  const displayPrice = product.price > 0 ? product.price : product.mrp

  return (
    <Link
      href={`/product/${product.id}`}
      className="group w-full max-w-[200px] sm:max-w-[240px] mx-auto"
    >
      <div className="bg-[#F5F5F5] dark:bg-slate-800 w-full h-[160px] sm:h-[200px] rounded-lg overflow-hidden relative">
        <Image
          fill
          className="object-cover group-hover:scale-110 transition duration-300"
          src={product.images[0]}
          alt={product.name}
          sizes="(max-width: 640px) 200px, 240px"
        />
      </div>
      <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-3 text-sm text-slate-800 pt-2">
        <div>
          <p className="truncate">{product.name}</p>
          <p className="font-medium lg:hidden">{currency}{formatPrice(displayPrice)}</p>
          <div className="flex">
            {Array(5)
              .fill('')
              .map((_, index) => (
                <StarIcon
                  key={index}
                  size={14}
                  className="text-transparent mt-0.5"
                  fill={rating >= index + 1 ? '#00C950' : '#D1D5DB'}
                />
              ))}
          </div>
        </div>
        <p className="font-medium hidden lg:block">{currency}{formatPrice(displayPrice)}</p>
      </div>
    </Link>
  )
}

export default ProductCard
