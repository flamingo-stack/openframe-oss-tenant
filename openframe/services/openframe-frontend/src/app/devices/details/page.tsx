'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AppLayout } from '../../components/app-layout'
import { DeviceDetailsView } from '../components/device-details-view'

function DeviceDetailsContent() {
  const searchParams = useSearchParams()
  const deviceId = searchParams.get('id')

  if (!deviceId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400">No device ID provided</p>
        </div>
      </div>
    )
  }

  return <DeviceDetailsView deviceId={deviceId} />
}

export default function DeviceDetailsPage() {
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
        <DeviceDetailsContent />
      </Suspense>
    </AppLayout>
  )
}