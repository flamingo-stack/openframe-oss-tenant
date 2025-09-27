
'use client'

import React from 'react'
import { TabNavigation, TabContent, getTabComponent, type TabItem } from '@flamingo/ui-kit'
import { BuildingsIcon, UsersGroupIcon, ShieldLockIcon, UserIcon } from '@flamingo/ui-kit'
import { KeyRound as KeyIcon } from 'lucide-react'
import { ArchitectureTab } from './architecture'
import { CompanyAndUsersTab } from './company-and-users'
import { ApiKeysTab } from './api-keys'
import { SsoConfigurationTab } from './sso-configuration'
import { ProfileTab } from './profile'

interface SettingsTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export const SETTINGS_TABS: TabItem[] = [
  { id: 'architecture', label: 'Architecture', icon: BuildingsIcon, component: ArchitectureTab },
  { id: 'company-and-users', label: 'Company & Users', icon: UsersGroupIcon, component: CompanyAndUsersTab },
  { id: 'api-keys', label: 'API Keys', icon: KeyIcon, component: ApiKeysTab },
  { id: 'sso-configuration', label: 'SSO Configuration', icon: ShieldLockIcon, component: SsoConfigurationTab },
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


