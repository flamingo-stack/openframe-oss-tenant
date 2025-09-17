'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AppLayout } from '../../components/app-layout'
import { ScriptDetailsView } from '../components/script-details-view'

function ScriptDetailsContent() {
  const searchParams = useSearchParams()
  const scriptId = searchParams.get('id')

  if (!scriptId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400">No script ID provided</p>
        </div>
      </div>
    )
  }

  return <ScriptDetailsView scriptId={scriptId} />
}

export default function ScriptDetailsPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-[#3a3a3a] rounded mb-6" />
            <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-64 bg-[#3a3a3a] rounded mb-4" />
                </div>
                <div className="space-y-4">
                  <div className="h-32 bg-[#3a3a3a] rounded" />
                  <div className="h-32 bg-[#3a3a3a] rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      }>
        <ScriptDetailsContent />
      </Suspense>
    </AppLayout>
  )
}
