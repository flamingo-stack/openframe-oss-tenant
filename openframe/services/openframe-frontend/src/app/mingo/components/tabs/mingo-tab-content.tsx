'use client'

import React from 'react'
import { TabContent } from '@flamingo/ui-kit'
import { getTabComponent } from './mingo-tabs'

interface MingoTabContentProps {
  activeTab: string
}

export function MingoTabContent({ activeTab }: MingoTabContentProps) {
  const TabComponent = getTabComponent(activeTab)

  return (
    <TabContent
      activeTab={activeTab}
      TabComponent={TabComponent}
    />
  )
}