'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TabNavigation, TabItem, MessageCircleIcon, ArchiveIcon } from '@flamingo-stack/openframe-frontend-core'
import { CurrentChats, ArchivedChats } from './chats-table'

export const TICKETS_TABS: TabItem[] = [
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

export const getTicketsTab = (tabId: string): TabItem | undefined =>
  TICKETS_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getTicketsTab(tabId)
  return tab?.component || null
}

interface TicketsTabNavigationProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function TicketsTabNavigation({ activeTab, onTabChange }: TicketsTabNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Clear all tab-specific params when switching tabs (clean slate for each tab)
  const defaultHandleTabChange = useCallback((tabId: string) => {
    // Navigate to clean URL with only the tab param
    router.replace(`${pathname}?tab=${tabId}`)
  }, [router, pathname])

  const handleTabChange = onTabChange || defaultHandleTabChange

  return (
    <TabNavigation
      urlSync={false}
      activeTab={activeTab || "current"}
      tabs={TICKETS_TABS}
      onTabChange={handleTabChange}
    />
  )
}