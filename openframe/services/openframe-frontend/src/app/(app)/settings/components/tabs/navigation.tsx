'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import {
  Hierarchy02Icon,
  PasscodeIcon,
  ShieldKeyholeIcon,
  UserIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { isOssTenantMode } from '@/lib/app-mode';
import { ApiKeysTab } from './api-keys';
import { ArchitectureTab } from './architecture';
import { CompanyAndUsersTab } from './company-and-users';
import { ProfileTab } from './profile';
import { SsoConfigurationTab } from './sso-configuration';

interface SettingsTabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const SETTINGS_TABS: TabItem[] = [
  { id: 'architecture', label: 'Architecture', icon: Hierarchy02Icon, component: ArchitectureTab },
  { id: 'company-and-users', label: 'Company & Users', icon: UsersGroupIcon, component: CompanyAndUsersTab },
  { id: 'api-keys', label: 'API Keys', icon: ShieldKeyholeIcon, component: ApiKeysTab },
  { id: 'sso-configuration', label: 'SSO Configuration', icon: PasscodeIcon, component: SsoConfigurationTab },
  { id: 'profile', label: 'Profile', icon: UserIcon, component: ProfileTab },
];

export const getSettingsTabs = (): TabItem[] =>
  SETTINGS_TABS.filter(tab => tab.id !== 'architecture' || isOssTenantMode());

export function SettingsTabNavigation({ activeTab, onTabChange }: SettingsTabNavigationProps) {
  return <TabNavigation activeTab={activeTab} onTabChange={onTabChange} tabs={getSettingsTabs()} />;
}
