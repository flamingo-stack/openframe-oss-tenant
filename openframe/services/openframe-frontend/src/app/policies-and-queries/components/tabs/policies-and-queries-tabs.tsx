'use client'

import { TabItem } from '@flamingo-stack/openframe-frontend-core'
import { PoliciesIcon, QueriesIcon } from '@flamingo-stack/openframe-frontend-core'
import { Policies } from './policies'
import { Queries } from './queries'

export const POLICIES_AND_QUERIES_TABS: TabItem[] = [
  {
    id: 'policies',
    label: 'Policies',
    icon: PoliciesIcon,
    component: Policies
  },
  {
    id: 'queries',
    label: 'Queries',
    icon: QueriesIcon,
    component: Queries
  }
]

export const getPoliciesAndQueriesTab = (tabId: string): TabItem | undefined =>
  POLICIES_AND_QUERIES_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getPoliciesAndQueriesTab(tabId)
  return tab?.component || null
}