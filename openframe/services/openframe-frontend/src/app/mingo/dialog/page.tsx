'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AppLayout } from '../../components/app-layout'
import { DialogDetailsView } from '../components/dialog-details-view'

function DialogDetailsContent() {
  const searchParams = useSearchParams()
  const dialogId = searchParams.get('id')

  if (!dialogId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400">No dialog ID provided</p>
        </div>
      </div>
    )
  }

  return <DialogDetailsView dialogId={dialogId} />
}

export default function DialogDetailsPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-[#3a3a3a] rounded mb-6" />
            <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-20 bg-[#3a3a3a] rounded mb-2" />
                    <div className="h-6 w-32 bg-[#3a3a3a] rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }>
        <DialogDetailsContent />
      </Suspense>
    </AppLayout>
  )
}