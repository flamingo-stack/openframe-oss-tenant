'use client'

import React, { useState } from "react"
import { TabNavigation, TabContent, getTabComponent } from '@flamingo/ui-kit'
import { MINGO_TABS } from './tabs/mingo-tabs'

type TabId = 'current' | 'archived'

export function MingoView() {
  const [activeTab, setActiveTab] = useState<TabId>('current')

  const TabComponent = getTabComponent(MINGO_TABS, activeTab)

  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
        tabs={MINGO_TABS}
      />

      <TabContent
        activeTab={activeTab}
        TabComponent={TabComponent}
      />
    </div>
  )
}