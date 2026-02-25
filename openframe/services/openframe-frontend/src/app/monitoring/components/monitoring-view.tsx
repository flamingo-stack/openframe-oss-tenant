'use client'

import { TabNavigation, TabContent, getTabComponent } from '@flamingo-stack/openframe-frontend-core'
import { MONITORING_TABS } from './tabs/monitoring-tabs'

export function MonitoringView() {
  return (
    <div className="flex flex-col w-full">
      <TabNavigation
        tabs={MONITORING_TABS}
        defaultTab="policies"
        urlSync={true}
      >
        {(activeTab) => (
          <TabContent
            activeTab={activeTab}
            TabComponent={getTabComponent(MONITORING_TABS, activeTab)}
          />
        )}
      </TabNavigation>
    </div>
  )
}
