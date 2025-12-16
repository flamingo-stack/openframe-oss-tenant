'use client'

import React from "react"
import { TabNavigation, TabContent, getTabComponent } from '@flamingo-stack/openframe-frontend-core'
import { POLICIES_AND_QUERIES_TABS } from './tabs/policies-and-queries-tabs'

export function PoliciesAndQueriesView() {
  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        tabs={POLICIES_AND_QUERIES_TABS}
        defaultTab="policies"
        urlSync={true}
      >
        {(activeTab) => (
          <TabContent
            activeTab={activeTab}
            TabComponent={getTabComponent(POLICIES_AND_QUERIES_TABS, activeTab)}
          />
        )}
      </TabNavigation>
    </div>
  )
}