'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import CategoriesMarquee from './CategoriesMarquee'

const Hero = () => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

  return (
    <div className="w-full">
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        loop
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        modules={[Autoplay, Pagination, Navigation]}
        className="w-full"
      >
        {/* Slide 1 */}
        <SwiperSlide>
          <div className="relative flex flex-col bg-green-200 rounded-none w-full 
            h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] group">
            <div className="p-5 sm:p-10">
              <div className="inline-flex items-center gap-3 bg-green-300 text-green-600 pr-4 p-1 rounded-full text-xs sm:text-sm">
                <span className="bg-green-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs">NEWS</span>
                Free Shipping on Orders Above $50!
                <ChevronRightIcon className="group-hover:ml-2 transition-all" size={16} />
              </div>
              <h2 className="text-2xl sm:text-4xl leading-[1.2] my-3 font-medium bg-gradient-to-r from-slate-600 to-[#A0FF74] bg-clip-text text-transparent max-w-xs sm:max-w-md">
                Gadgets you'll love. Prices you'll trust.
              </h2>
              <div className="text-slate-800 text-sm font-medium mt-2 sm:mt-4">
                <p>Starts from</p>
                <p className="text-2xl">{currency}4.90</p>
              </div>
              <button className="bg-slate-800 text-white text-xs sm:text-sm py-2 px-5 sm:py-3 sm:px-8 mt-3 sm:mt-6 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition">
                LEARN MORE
              </button>
            </div>
            <Image
              className="absolute bottom-0 right-0 md:right-10 w-full sm:max-w-xs object-contain"
              src={assets.hero_model_img}
              alt=""
              priority
            />
          </div>
        </SwiperSlide>

        {/* Slide 2 */}
        <SwiperSlide>
          <div className="flex items-center justify-between w-full 
            h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] 
            bg-orange-200 rounded-none p-4 sm:p-6 group">
            <div>
              <p className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#FFAD51] bg-clip-text text-transparent max-w-40">
                Best products
              </p>
              <p className="flex items-center gap-1 mt-2 sm:mt-4 text-sm sm:text-base">
                View more <ArrowRightIcon className="group-hover:ml-2 transition-all" size={18} />
              </p>
            </div>
            <Image
              src={assets.hero_product_img1}
              alt=""
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
            />
          </div>
        </SwiperSlide>

        {/* Slide 3 */}
        <SwiperSlide>
          <div className="flex items-center justify-between w-full 
            h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] 
            bg-blue-200 rounded-none p-4 sm:p-6 group">
            <div>
              <p className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-slate-800 to-[#78B2FF] bg-clip-text text-transparent max-w-40">
                20% discounts
              </p>
              <p className="flex items-center gap-1 mt-2 sm:mt-4 text-sm sm:text-base">
                View more <ArrowRightIcon className="group-hover:ml-2 transition-all" size={18} />
              </p>
            </div>
            <Image
              src={assets.hero_product_img2}
              alt=""
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
            />
          </div>
        </SwiperSlide>
      </Swiper>

      {/* Full-width marquee directly beneath slider */}
      <CategoriesMarquee />
    </div>
  )
}

export default Hero
