'use client';

import {
  AuditIcon,
  BracketSquareCheckIcon,
  ClipboardListIcon,
  HardDrivesIcon,
  Hierarchy02Icon,
  ShieldIcon,
  TerminalBrowserIcon,
  UsersIcon,
  WebDesignIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
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
    icon: HardDrivesIcon,
    component: HardwareTab,
  },
  {
    id: 'network',
    label: 'Network',
    icon: Hierarchy02Icon,
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
    icon: AuditIcon,
    component: ComplianceTab,
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: TerminalBrowserIcon,
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
    icon: WebDesignIcon,
    component: SoftwareTab,
  },
  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: BracketSquareCheckIcon,
    component: VulnerabilitiesTab,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: ClipboardListIcon,
    component: LogsTab,
  },
];

export const getDeviceTab = (tabId: string): TabItem | undefined => DEVICE_TABS.find(tab => tab.id === tabId);

export const getTabComponent = (tabId: string): React.ComponentType<{ device: any }> | null => {
  const tab = getDeviceTab(tabId);
  return tab?.component || null;
};
