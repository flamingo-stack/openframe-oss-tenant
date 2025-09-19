'use client'

import React, { useState } from "react"
import { 
  PoliciesAndQueriesTabContent, 
  PoliciesAndQueriesTabNavigation 
} from './tabs'

type TabId = 'policies' | 'queries'

export function PoliciesAndQueriesView() {
  const [activeTab, setActiveTab] = useState<TabId>('policies')

  return (
    <div className="flex flex-col w-full">
      <PoliciesAndQueriesTabNavigation
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
      />

      <PoliciesAndQueriesTabContent activeTab={activeTab} />
    </div>
  )
}