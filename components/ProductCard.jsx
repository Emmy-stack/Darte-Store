'use client'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

  // calculate the average rating of the product
  const rating = Math.round(
    product.rating.reduce((acc, curr) => acc + curr.rating, 0) /
      product.rating.length
  )

  return (
    <Link
      href={`/product/${product.id}`}
      className="group w-full max-w-[200px] sm:max-w-[240px] mx-auto"
    >
      <div className="bg-[#F5F5F5] w-full h-[160px] sm:h-[200px] rounded-lg flex items-center justify-center">
        <Image
          width={500}
          height={500}
          className="max-h-[120px] sm:max-h-[160px] w-auto group-hover:scale-110 transition duration-300 object-contain"
          src={product.images[0]}
          alt={product.name}
        />
      </div>
      <div className="flex justify-between gap-3 text-sm text-slate-800 pt-2">
        <div>
          <p className="truncate">{product.name}</p>
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
        <p className="font-medium">{currency}{product.price}</p>
      </div>
    </Link>
  )
}

export default ProductCard
