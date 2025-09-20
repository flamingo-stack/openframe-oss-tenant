'use client'

import React, { useState } from "react"
import { 
  MingoTabNavigation, 
  MingoTabContent 
} from './tabs'

type TabId = 'current' | 'archived'

export function MingoView() {
  const [activeTab, setActiveTab] = useState<TabId>('current')

  return (
    <div className="flex flex-col w-full">
      {/* Tab Navigation */}
      <MingoTabNavigation
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
      />

      {/* Tab Content */}
      <MingoTabContent activeTab={activeTab} />
    </div>
  )
}