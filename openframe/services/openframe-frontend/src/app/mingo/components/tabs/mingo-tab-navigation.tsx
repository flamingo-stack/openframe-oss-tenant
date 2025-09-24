'use client'

import React from 'react'
import { Button } from '@flamingo/ui-kit'
import { MessageCircle, Archive } from 'lucide-react'
import { CurrentChats } from './current-chats'
import { ArchivedChats } from './archived-chats'

export interface MingoTab {
  id: string
  label: string
  icon: React.ReactNode
  component: React.ComponentType
}

interface MingoTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

const MINGO_TABS: MingoTab[] = [
  { 
    id: 'current', 
    label: 'Current Chats', 
    icon: <MessageCircle className="h-6 w-6" />,
    component: CurrentChats
  },
  { 
    id: 'archived', 
    label: 'Archived Chats', 
    icon: <Archive className="h-6 w-6" />,
    component: ArchivedChats
  }
]

export const getMingoTabs = (): MingoTab[] => MINGO_TABS

export const getMingoTab = (tabId: string): MingoTab | undefined => 
  MINGO_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getMingoTab(tabId)
  return tab?.component || null
}

export function MingoTabNavigation({ activeTab, onTabChange }: MingoTabNavigationProps) {
  return (
    <div className="bg-ods-bg relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center justify-start h-full overflow-x-auto">
        {MINGO_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant="ghost"
              className={`
                flex gap-2 items-center justify-center p-4 relative shrink-0 h-14
                transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-b from-[rgba(255,192,8,0)] to-[rgba(255,192,8,0.1)]' 
                  : 'hover:bg-ods-card/50'
                }
              `}
            >
              {/* Icon */}
              <div className="relative">
                <div className={`${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors`}>
                  {tab.icon}
                </div>
              </div>
              
              {/* Tab label */}
              <span className={`
                font-['DM_Sans'] font-medium text-[18px] leading-[24px] whitespace-nowrap
                ${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors
              `}>
                {tab.label}
              </span>
              
              {/* Active tab indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-ods-accent" />
              )}
            </Button>
          )
        })}
        
        {/* Gradient overlay */}
        <div className="absolute right-0 top-0 w-10 h-14 bg-gradient-to-r from-transparent to-bg-primary pointer-events-none" />
      </div>
    </div>
  )
}