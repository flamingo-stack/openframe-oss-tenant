'use client'

import React from 'react'
import { getTabComponent } from './mingo-tab-navigation'

interface MingoTabContentProps {
  activeTab: string
}

export function MingoTabContent({ activeTab }: MingoTabContentProps) {
  const TabComponent = getTabComponent(activeTab)
  
  if (!TabComponent) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ods-text-primary mb-2">Tab Not Found</h3>
          <p className="text-ods-text-secondary">The selected tab "{activeTab}" could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[400px]">
      <TabComponent />
    </div>
  )
}