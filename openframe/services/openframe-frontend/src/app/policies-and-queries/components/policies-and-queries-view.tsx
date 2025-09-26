'use client'

import React, { useState } from "react"
import { TabNavigation, TabContent, getTabComponent } from '@flamingo/ui-kit'
import { POLICIES_AND_QUERIES_TABS } from './tabs/policies-and-queries-tabs'

type TabId = 'policies' | 'queries'

export function PoliciesAndQueriesView() {
  const [activeTab, setActiveTab] = useState<TabId>('policies')

  const TabComponent = getTabComponent(POLICIES_AND_QUERIES_TABS, activeTab)

  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
        tabs={POLICIES_AND_QUERIES_TABS}
      />

      <TabContent
        activeTab={activeTab}
        TabComponent={TabComponent}
      />
    </div>
  )
}