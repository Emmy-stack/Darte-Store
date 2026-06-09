'use client'

import React, { useState, useEffect } from 'react'
import { LayoutTemplate, Upload, LinkIcon, RotateCcw, Save, Loader2, CheckCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

// Default slide configuration details for visual matching
const defaultSlides = [
  {
    index: 0,
    title: "Gadgets you'll love. Prices you'll trust.",
    bgColor: "bg-green-100 border-green-200",
    imgClassName: "absolute bottom-0 right-2 w-20 object-contain h-24"
  },
  {
    index: 1,
    title: "Best products",
    bgColor: "bg-orange-100 border-orange-200",
    imgClassName: "w-16 h-16 object-contain"
  },
  {
    index: 2,
    title: "20% discounts",
    bgColor: "bg-blue-100 border-blue-200",
    imgClassName: "w-16 h-16 object-contain"
  }
]

export default function HeroAdPage() {
  const [loading, setLoading] = useState(true)
  const [slidesData, setSlidesData] = useState([
    { index: 0, imageUrl: '', link: '', file: null, previewUrl: '' },
    { index: 1, imageUrl: '', link: '', file: null, previewUrl: '' },
    { index: 2, imageUrl: '', link: '', file: null, previewUrl: '' }
  ])
  const [savingSlide, setSavingSlide] = useState({ 0: false, 1: false, 2: false })
  const [resettingSlide, setResettingSlide] = useState({ 0: false, 1: false, 2: false })

  const fetchSlides = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/advertisements/hero')
      const data = await res.json()
      if (data.success && data.slides) {
        const updated = [
          { index: 0, imageUrl: '', link: '', file: null, previewUrl: '' },
          { index: 1, imageUrl: '', link: '', file: null, previewUrl: '' },
          { index: 2, imageUrl: '', link: '', file: null, previewUrl: '' }
        ]
        data.slides.forEach(slide => {
          if (slide.index >= 0 && slide.index <= 2) {
            updated[slide.index] = {
              index: slide.index,
              imageUrl: slide.imageUrl || '',
              link: slide.link || '',
              file: null,
              previewUrl: ''
            }
          }
        })
        setSlidesData(updated)
      }
    } catch (error) {
      console.error("Error loading slides config:", error)
      toast.error("Failed to load slider configuration")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlides()
  }, [])

  const handleFileChange = (index, e) => {
    const file = e.target.files[0]
    if (!file) return

    // Preview url creation
    const previewUrl = URL.createObjectURL(file)
    setSlidesData(prev => prev.map((slide, i) => {
      if (i === index) {
        return { ...slide, file, previewUrl }
      }
      return slide
    }))
  }

  const handleLinkChange = (index, value) => {
    setSlidesData(prev => prev.map((slide, i) => {
      if (i === index) {
        return { ...slide, link: value }
      }
      return slide
    }))
  }

  const handleUpdate = async (index) => {
    const slide = slidesData[index]
    
    // Validate: if it is not customized yet and no new file selected, prompt user
    if (!slide.imageUrl && !slide.file) {
      toast.error("Please select an image file to upload first")
      return
    }

    try {
      setSavingSlide(prev => ({ ...prev, [index]: true }))
      const formData = new FormData()
      formData.append("index", index.toString())
      formData.append("link", slide.link || '')
      if (slide.file) {
        formData.append("image", slide.file)
      }

      const res = await fetch('/api/admin/advertisement/hero', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || `Slide ${index + 1} updated!`)
        // Clear file input/preview and update imageUrl
        setSlidesData(prev => prev.map((s, i) => {
          if (i === index) {
            return {
              ...s,
              imageUrl: data.slide.imageUrl,
              file: null,
              previewUrl: ''
            }
          }
          return s
        }))
      } else {
        toast.error(data.message || "Failed to update slide")
      }
    } catch (err) {
      console.error("Error updating slide:", err)
      toast.error("An error occurred during submission")
    } finally {
      setSavingSlide(prev => ({ ...prev, [index]: false }))
    }
  }

  const handleReset = async (index) => {
    try {
      setResettingSlide(prev => ({ ...prev, [index]: true }))
      const formData = new FormData()
      formData.append("index", index.toString())
      formData.append("action", "reset")

      const res = await fetch('/api/admin/advertisement/hero', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || `Slide ${index + 1} reset to default!`)
        setSlidesData(prev => prev.map((s, i) => {
          if (i === index) {
            return {
              index,
              imageUrl: '',
              link: '',
              file: null,
              previewUrl: ''
            }
          }
          return s
        }))
      } else {
        toast.error(data.message || "Failed to reset slide")
      }
    } catch (err) {
      console.error("Error resetting slide:", err)
      toast.error("An error occurred during reset")
    } finally {
      setResettingSlide(prev => ({ ...prev, [index]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-green-600 mb-2" size={36} />
        <p className="text-slate-500 text-sm font-medium">Loading slider configuration...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-semibold text-slate-800 flex items-center gap-2">
          <LayoutTemplate size={28} className="text-green-600" />
          Hero-Section Slider Customizer
        </h1>
        <p className="text-slate-500">
          Upload custom banner images and set optional redirect links for the homepage slider.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex gap-3 text-sm text-blue-700">
        <Info className="flex-shrink-0 mt-0.5" size={18} />
        <div>
          <span className="font-semibold">Pro Tip:</span> Optional links can lead to product pages (e.g., <code className="bg-blue-100 px-1 rounded">/product/cuid</code>) or seller profiles (e.g., <code className="bg-blue-100 px-1 rounded">/store/username</code>). Leave the link empty to keep the slide non-clickable.
        </div>
      </div>

      {/* Grid of 3 Slides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {slidesData.map((slide, idx) => {
          const config = defaultSlides[idx]
          const isCustom = !!slide.imageUrl
          const currentImage = slide.previewUrl || slide.imageUrl || config.defaultImage
          const isSaving = savingSlide[slide.index]
          const isResetting = resettingSlide[slide.index]

          return (
            <div key={slide.index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              
              {/* Card Header & Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 text-lg">Slide {slide.index + 1}</h3>
                  <div className="flex items-center gap-1.5">
                    {isCustom ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Custom
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Simulated Live Preview */}
                <div className={`relative h-32 rounded-xl flex items-center justify-center overflow-hidden border ${!isCustom && !slide.previewUrl ? config.bgColor : 'bg-slate-50'}`}>
                  {slide.link && (
                    <div className="absolute top-2 left-2 z-10">
                      <p className="text-[9px] text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium">
                        <LinkIcon size={8} /> Link Active
                      </p>
                    </div>
                  )}

                  <div className={!isCustom && !slide.previewUrl ? "w-full h-full flex items-center justify-center relative p-2" : "w-full h-full relative"}>
                    <Image
                      src={currentImage}
                      alt={`Slide ${slide.index + 1}`}
                      fill
                      sizes="200px"
                      className={!isCustom && !slide.previewUrl ? "object-contain max-h-full max-w-full" : "object-cover w-full h-full"}
                      unoptimized={typeof currentImage === 'string'}
                    />
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Banner Image
                  </label>
                  <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-green-500 rounded-xl p-4 transition-colors cursor-pointer bg-slate-50/50">
                    <Upload size={20} className="text-slate-400 group-hover:text-green-500 mb-1" />
                    <span className="text-xs text-slate-500 group-hover:text-slate-700 text-center font-medium">
                      {slide.file ? slide.file.name : "Select custom image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(slide.index, e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Redirect Link Input */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <LinkIcon size={12} /> Target Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={slide.link}
                    placeholder="/product/xyz or /store/my-store"
                    onChange={(e) => handleLinkChange(slide.index, e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-green-500 transition-colors bg-slate-50/30"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleUpdate(slide.index)}
                  disabled={isSaving || isResetting}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2.5 rounded-xl disabled:opacity-50 transition active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>

                {isCustom && (
                  <button
                    onClick={() => handleReset(slide.index)}
                    disabled={isSaving || isResetting}
                    className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm py-2.5 rounded-xl disabled:opacity-50 transition active:scale-[0.98]"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} /> Reset to Default
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
