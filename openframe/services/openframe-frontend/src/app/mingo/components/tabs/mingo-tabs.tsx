'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TabNavigation, TabItem, MessageCircleIcon, ArchiveIcon } from '@flamingo-stack/openframe-frontend-core'
import { CurrentChats, ArchivedChats } from './chats-table'

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
  const router = useRouter()
  const pathname = usePathname()

  // Clear all tab-specific params when switching tabs (clean slate for each tab)
  const handleTabChange = useCallback((tabId: string) => {
    // Navigate to clean URL with only the tab param
    router.replace(`${pathname}?tab=${tabId}`)
  }, [router, pathname])

  return (
    <TabNavigation
      urlSync={true}
      defaultTab="current"
      tabs={MINGO_TABS}
      onTabChange={handleTabChange}
    />
  )
}