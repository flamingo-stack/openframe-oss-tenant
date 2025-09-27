'use client'

import { TabItem } from '@flamingo/ui-kit'
import { MessageCircleIcon, ArchiveIcon } from '@flamingo/ui-kit'
import { CurrentChats } from './current-chats'
import { ArchivedChats } from './archived-chats'

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