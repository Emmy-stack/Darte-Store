'use client'

import React from 'react'
import { Sidebar, Settings } from 'lucide-react'

export default function SidebarAdPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-semibold text-slate-800 flex items-center gap-2">
          <Sidebar size={28} className="text-green-600" />
          Sidebar Advertisement
        </h1>
        <p className="text-slate-500">Configure advertisements shown in the store sidebar.</p>
      </div>

      {/* Placeholder Content */}
      <div className="flex flex-col items-center justify-center min-h-[350px] border border-dashed border-slate-300 bg-slate-50/50 rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
        <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-full text-slate-400 mb-4 animate-pulse">
          <Settings size={28} />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">Section Empty for Now</h3>
        <p className="text-slate-500 max-w-md text-sm leading-relaxed">
          This panel is set up and ready. You can build out the sidebar layout, ad spaces, and promotional banners here later.
        </p>
      </div>
    </div>
  )
}
