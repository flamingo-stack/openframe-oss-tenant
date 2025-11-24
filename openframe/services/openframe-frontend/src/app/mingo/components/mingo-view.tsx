'use client'

import React from "react"
import { useSearchParams } from 'next/navigation'
import { MingoTabNavigation } from './tabs'
import { MingoTabContent } from './tabs/mingo-tab-content'

export function MingoView() {
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab') || 'current'

  return (
    <div className="flex flex-col w-full">
      <MingoTabNavigation />
      <MingoTabContent activeTab={activeTab} />
    </div>
  )
}