'use client'

import React from 'react'
import { Button } from '@flamingo/ui-kit'
import { BuildingsIcon, UsersGroupIcon, ShieldLockIcon, UserIcon } from '@flamingo/ui-kit'
import { KeyRound as KeyIcon } from 'lucide-react'
import { ArchitectureTab } from './architecture'
import { CompanyAndUsersTab } from './company-and-users'
import { ApiKeysTab } from './api-keys'
import { SsoConfigurationTab } from './sso-configuration'
import { ProfileTab } from './profile'

export interface SettingsTab {
  id: string
  label: string
  icon: React.ReactNode
  component: React.ComponentType
}

interface SettingsTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

// NOTE: Icons are placeholders selected to be visually similar; can be updated later
export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'architecture', label: 'Architecture', icon: <BuildingsIcon className="h-6 w-6" />, component: ArchitectureTab },
  { id: 'company-and-users', label: 'Company & Users', icon: <UsersGroupIcon className="h-6 w-6" />, component: CompanyAndUsersTab },
  { id: 'api-keys', label: 'API Keys', icon: <KeyIcon className="h-6 w-6" />, component: ApiKeysTab },
  { id: 'sso-configuration', label: 'SSO Configuration', icon: <ShieldLockIcon className="h-6 w-6" />, component: SsoConfigurationTab },
  { id: 'profile', label: 'Profile', icon: <UserIcon className="h-6 w-6" />, component: ProfileTab }
]

export const getSettingsTabs = (): SettingsTab[] => SETTINGS_TABS

export const getSettingsTab = (tabId: string): SettingsTab | undefined =>
  SETTINGS_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getSettingsTab(tabId)
  return tab?.component || null
}

export function SettingsTabNavigation({ activeTab, onTabChange }: SettingsTabNavigationProps) {
  return (
    <div className="bg-ods-bg relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center justify-start h-full overflow-x-auto">
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant="ghost"
              leftIcon={<div className={`${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors`}>
              {tab.icon}
            </div>}
              className={`
                flex gap-2 items-center justify-center p-4 relative shrink-0 h-14
                transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-b from-[rgba(255,192,8,0)] to-[rgba(255,192,8,0.1)]' 
                  : 'hover:bg-ods-card/50'
                }
              `}
            >
              <span className={`
                font-['DM_Sans'] font-medium text-[18px] leading-[24px] whitespace-nowrap
                ${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors
              `}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-ods-accent" />
              )}
            </Button>
          )
        })}
        <div className="absolute right-0 top-0 w-10 h-14 bg-gradient-to-r from-transparent to-bg-primary pointer-events-none" />
      </div>
    </div>
  )
}


