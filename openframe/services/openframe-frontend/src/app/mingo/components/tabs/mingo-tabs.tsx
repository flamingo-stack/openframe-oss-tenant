'use client'

import React from 'react'
import { TabNavigation, TabItem, MessageCircleIcon, ArchiveIcon } from '@flamingo/ui-kit'
import { CurrentChats } from './current-chats'
import { ArchivedChats } from './archived-chats'

interface MingoTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export const MINGO_TABS: TabItem[] = [
  {
    id: 'current',
    label: 'Current Chats',
    icon: MessageCircleIcon,
    component: CurrentChats
  },
  {
    id: 'archived',
    label: 'Archived Chats',
    icon: ArchiveIcon,
    component: ArchivedChats
  }
]

export const getMingoTab = (tabId: string): TabItem | undefined =>
  MINGO_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getMingoTab(tabId)
  return tab?.component || null
}

export function MingoTabNavigation() {
  return (
    <TabNavigation
      urlSync={true}
      defaultTab="current"
      tabs={MINGO_TABS}
    />
  )
}