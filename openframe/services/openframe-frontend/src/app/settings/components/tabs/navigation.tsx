'use client';

import {
  NetworkIcon,
  ShieldCheckIcon,
  ShieldKeyIcon,
  type TabItem,
  TabNavigation,
  UserIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core';
import { SSOConfigurationIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import React from 'react';
import { AiSettingsTab } from './ai-settings';
import { ApiKeysTab } from './api-keys';
import { ArchitectureTab } from './architecture';
import { CompanyAndUsersTab } from './company-and-users';
import { ProfileTab } from './profile';
import { SsoConfigurationTab } from './sso-configuration';

interface SettingsTabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const BoldShieldCheckIcon = (props: any) => <ShieldCheckIcon {...props} strokeWidth={2.5} />;

export const SETTINGS_TABS: TabItem[] = [
  { id: 'ai-settings', label: 'AI Settings', icon: BoldShieldCheckIcon, component: AiSettingsTab },
  { id: 'architecture', label: 'Architecture', icon: NetworkIcon, component: ArchitectureTab },
  { id: 'company-and-users', label: 'Company & Users', icon: UsersGroupIcon, component: CompanyAndUsersTab },
  { id: 'api-keys', label: 'API Keys', icon: ShieldKeyIcon, component: ApiKeysTab },
  { id: 'sso-configuration', label: 'SSO Configuration', icon: SSOConfigurationIcon, component: SsoConfigurationTab },
  { id: 'profile', label: 'Profile', icon: UserIcon, component: ProfileTab },
];

export const getSettingsTabs = (): TabItem[] => SETTINGS_TABS;

export function SettingsTabNavigation({ activeTab, onTabChange }: SettingsTabNavigationProps) {
  return <TabNavigation activeTab={activeTab} onTabChange={onTabChange} tabs={SETTINGS_TABS} />;
}
