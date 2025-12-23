'use client'

import React from 'react'
import { TabContent } from '@flamingo-stack/openframe-frontend-core'
import { getTabComponent } from './policies-and-queries-tabs'

interface PoliciesAndQueriesTabContentProps {
  activeTab: string
}

export function PoliciesAndQueriesTabContent({ activeTab }: PoliciesAndQueriesTabContentProps) {
  const TabComponent = getTabComponent(activeTab)

  return (
    <TabContent
      activeTab={activeTab}
      TabComponent={TabComponent}
    />
  )
}