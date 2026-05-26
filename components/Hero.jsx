'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import CategoriesMarquee from './CategoriesMarquee'
import formatPrice from '@/lib/formatPrice'

const Hero = () => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

  const [slides, setSlides] = useState([
    { index: 0, imageUrl: '', link: '' },
    { index: 1, imageUrl: '', link: '' },
    { index: 2, imageUrl: '', link: '' }
  ])

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await fetch('/api/advertisements/hero')
        const data = await res.json()
        if (data.success && data.slides) {
          setSlides(prev => {
            const updated = [...prev]
            data.slides.forEach(s => {
              if (s.index >= 0 && s.index <= 2) {
                updated[s.index] = {
                  index: s.index,
                  imageUrl: s.imageUrl,
                  link: s.link || ''
                }
              }
            })
            return updated
          })
        }
      } catch (error) {
        console.error("Error fetching hero slides:", error)
      }
    }
    fetchSlides()
  }, [])

  const SlideContainer = ({ href, className, children }) => {
    if (href) {
      return (
        <Link href={href} className={`${className} cursor-pointer block`}>
          {children}
        </Link>
      )
    }
    return <div className={className}>{children}</div>
  }

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
          <SlideContainer 
            href={slides[0].link} 
            className={`relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] overflow-hidden ${!slides[0].imageUrl ? 'bg-green-200 flex items-center justify-center' : ''}`}
          >
            <Image
              className={slides[0].imageUrl ? "w-full h-full object-cover" : "max-h-[90%] w-auto object-contain"}
              src={slides[0].imageUrl || assets.hero_model_img}
              alt="Hero Slide 1"
              priority
              fill={!!slides[0].imageUrl}
              width={slides[0].imageUrl ? undefined : 350}
              height={slides[0].imageUrl ? undefined : 450}
            />
          </SlideContainer>
        </SwiperSlide>

        {/* Slide 2 */}
        <SwiperSlide>
          <SlideContainer 
            href={slides[1].link} 
            className={`relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] overflow-hidden ${!slides[1].imageUrl ? 'bg-orange-200 flex items-center justify-center' : ''}`}
          >
            <Image
              className={slides[1].imageUrl ? "w-full h-full object-cover" : "max-h-[80%] w-auto object-contain"}
              src={slides[1].imageUrl || assets.hero_product_img1}
              alt="Hero Slide 2"
              fill={!!slides[1].imageUrl}
              width={slides[1].imageUrl ? undefined : 150}
              height={slides[1].imageUrl ? undefined : 150}
            />
          </SlideContainer>
        </SwiperSlide>

        {/* Slide 3 */}
        <SwiperSlide>
          <SlideContainer 
            href={slides[2].link} 
            className={`relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px] overflow-hidden ${!slides[2].imageUrl ? 'bg-blue-200 flex items-center justify-center' : ''}`}
          >
            <Image
              className={slides[2].imageUrl ? "w-full h-full object-cover" : "max-h-[80%] w-auto object-contain"}
              src={slides[2].imageUrl || assets.hero_product_img2}
              alt="Hero Slide 3"
              fill={!!slides[2].imageUrl}
              width={slides[2].imageUrl ? undefined : 150}
              height={slides[2].imageUrl ? undefined : 150}
            />
          </SlideContainer>
        </SwiperSlide>
      </Swiper>

      {/* Full-width marquee directly beneath slider */}
      <CategoriesMarquee />
    </div>
  )
}

export default Hero
