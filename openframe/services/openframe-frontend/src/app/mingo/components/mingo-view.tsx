'use client'

import React from "react"
import { TabNavigation, TabContent, getTabComponent } from '@flamingo/ui-kit'
import { MINGO_TABS } from './tabs/mingo-tabs'

export function MingoView() {
  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        tabs={MINGO_TABS}
        defaultTab="current"
        urlSync={true}
      >
        {(activeTab) => (
          <TabContent
            activeTab={activeTab}
            TabComponent={getTabComponent(MINGO_TABS, activeTab)}
          />
        )}
      </TabNavigation>
    </div>
  )
}