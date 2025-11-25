
'use client'

import React from 'react'
import { TabNavigation, UsersGroupIcon, UserIcon, type TabItem, NetworkIcon, ShieldKeyIcon, ShieldCheckIcon } from '@flamingo/ui-kit'
import { ArchitectureTab } from './architecture'
import { CompanyAndUsersTab } from './company-and-users'
import { ApiKeysTab } from './api-keys'
import { SsoConfigurationTab } from './sso-configuration'
import { ProfileTab } from './profile'
import { AISettingsTab } from './ai-settings'
import { SSOConfigurationIcon } from '@/ui-kit/src/components/icons/sso-configuration-icon'

interface SettingsTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

const BoldShieldCheckIcon = (props: any) => (
  <ShieldCheckIcon {...props} strokeWidth={2.5} />
)

export const SETTINGS_TABS: TabItem[] = [
  { id: 'ai-settings', label: 'AI Settings', icon: BoldShieldCheckIcon, component: AISettingsTab },
  { id: 'architecture', label: 'Architecture', icon: NetworkIcon, component: ArchitectureTab },
  { id: 'company-and-users', label: 'Company & Users', icon: UsersGroupIcon, component: CompanyAndUsersTab },
  { id: 'api-keys', label: 'API Keys', icon: ShieldKeyIcon, component: ApiKeysTab },
  { id: 'sso-configuration', label: 'SSO Configuration', icon: SSOConfigurationIcon, component: SsoConfigurationTab },
  { id: 'profile', label: 'Profile', icon: UserIcon, component: ProfileTab }
]

export const getSettingsTabs = (): TabItem[] => SETTINGS_TABS

export function SettingsTabNavigation({ activeTab, onTabChange }: SettingsTabNavigationProps) {
  return (
    <TabNavigation
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={SETTINGS_TABS}
    />
  )
}


