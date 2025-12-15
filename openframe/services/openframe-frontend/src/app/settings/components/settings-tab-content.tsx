'use client'

import React from 'react'
import { getTabComponent } from '@flamingo-stack/openframe-frontend-core'
import { SETTINGS_TABS } from './tabs'

interface SettingsTabContentProps {
  activeTab: string
}

export function SettingsTabContent({ activeTab }: SettingsTabContentProps) {
  const TabComponent = getTabComponent(SETTINGS_TABS, activeTab)
  
  if (!TabComponent) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ods-text-primary mb-2">Tab Not Found</h3>
          <p className="text-ods-text-secondary">The selected tab &quot;{activeTab}&quot; could not be found.</p>
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


