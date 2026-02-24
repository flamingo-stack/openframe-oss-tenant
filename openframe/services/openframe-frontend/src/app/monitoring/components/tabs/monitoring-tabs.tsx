'use client'

import { TabItem, PoliciesIcon, QueriesIcon } from '@flamingo-stack/openframe-frontend-core'
import { Policies } from './policies'
import { Checks } from './checks'
import { Queries } from './queries'
import { PulseIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'

export const MONITORING_TABS: TabItem[] = [
  {
    id: 'policies',
    label: 'Policies',
    icon: PoliciesIcon,
    component: Policies
  },
  // {
  //   id: 'checks',
  //   label: 'Checks',
  //   icon: PulseIcon,
  //   component: Checks
  // },
  {
    id: 'queries',
    label: 'Queries',
    icon: QueriesIcon,
    component: Queries
  }
]

export const getMonitoringTab = (tabId: string): TabItem | undefined =>
  MONITORING_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getMonitoringTab(tabId)
  return tab?.component || null
}
