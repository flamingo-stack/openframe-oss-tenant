'use client';

import {
  AlertTriangleIcon,
  BotIcon,
  CpuIcon,
  FileCheckIcon,
  FileTextIcon,
  NetworkIcon,
  PackageIcon,
  ShieldIcon,
  TabItem,
  UsersIcon,
} from '@flamingo-stack/openframe-frontend-core';
import { AgentsTab } from './agents-tab';
import { ComplianceTab } from './compliance-tab';
import { HardwareTab } from './hardware-tab';
import { LogsTab } from './logs-tab';
import { NetworkTab } from './network-tab';
import { SecurityTab } from './security-tab';
import { SoftwareTab } from './software-tab';
import { UsersTab } from './users-tab';
import { VulnerabilitiesTab } from './vulnerabilities-tab';

export const DEVICE_TABS: TabItem[] = [
  {
    id: 'hardware',
    label: 'Hardware',
    icon: CpuIcon,
    component: HardwareTab,
  },
  {
    id: 'network',
    label: 'Network',
    icon: NetworkIcon,
    component: NetworkTab,
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldIcon,
    component: SecurityTab,
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: FileCheckIcon,
    component: ComplianceTab,
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: BotIcon,
    component: AgentsTab,
  },
  {
    id: 'users',
    label: 'Users',
    icon: UsersIcon,
    component: UsersTab,
  },
  {
    id: 'software',
    label: 'Software',
    icon: PackageIcon,
    component: SoftwareTab,
  },
  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: AlertTriangleIcon,
    component: VulnerabilitiesTab,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: FileTextIcon,
    component: LogsTab,
  },
];

export const getDeviceTab = (tabId: string): TabItem | undefined => DEVICE_TABS.find(tab => tab.id === tabId);

export const getTabComponent = (tabId: string): React.ComponentType<{ device: any }> | null => {
  const tab = getDeviceTab(tabId);
  return tab?.component || null;
};
