'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AppLayout } from '../../components/app-layout'
import { EditScriptPage } from '../components/edit-script-page'

function EditScriptContent() {
  const searchParams = useSearchParams()
  const scriptId = searchParams.get('id')

  return <EditScriptPage scriptId={scriptId} />
}

export default function EditScriptPageWrapper() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-[#3a3a3a] rounded mb-6" />
            <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-[#3a3a3a] rounded" />
                <div className="h-32 bg-[#3a3a3a] rounded" />
              </div>
            </div>
          </div>
        </div>
      }>
        <EditScriptContent />
      </Suspense>
    </AppLayout>
  )
}
