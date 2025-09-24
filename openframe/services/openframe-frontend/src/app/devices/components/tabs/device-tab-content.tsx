'use client'

import React from 'react'
import { getTabComponent } from './device-tab-navigation'

interface DeviceTabContentProps {
  activeTab: string
  device: any
}

export function DeviceTabContent({ activeTab, device }: DeviceTabContentProps) {
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
      <TabComponent device={device} />
    </div>
  )
}
