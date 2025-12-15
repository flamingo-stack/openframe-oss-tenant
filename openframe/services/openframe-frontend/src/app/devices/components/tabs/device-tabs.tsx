'use client'

import { TabItem } from '@flamingo-stack/openframe-frontend-core'
import {
  CpuIcon,
  NetworkIcon,
  ShieldIcon,
  FileCheckIcon,
  BotIcon,
  UsersIcon,
  PackageIcon,
  AlertTriangleIcon,
  FileTextIcon
} from '@flamingo-stack/openframe-frontend-core'
import { HardwareTab } from './hardware-tab'
import { NetworkTab } from './network-tab'
import { SecurityTab } from './security-tab'
import { ComplianceTab } from './compliance-tab'
import { AgentsTab } from './agents-tab'
import { UsersTab } from './users-tab'
import { SoftwareTab } from './software-tab'
import { VulnerabilitiesTab } from './vulnerabilities-tab'
import { LogsTab } from './logs-tab'

export const DEVICE_TABS: TabItem[] = [
  {
    id: 'hardware',
    label: 'Hardware',
    icon: CpuIcon,
    component: HardwareTab
  },
  {
    id: 'network',
    label: 'Network',
    icon: NetworkIcon,
    component: NetworkTab
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldIcon,
    hasAlert: false,
    alertType: 'error',
    component: SecurityTab
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: FileCheckIcon,
    component: ComplianceTab
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: BotIcon,
    hasAlert: false,
    alertType: 'warning',
    component: AgentsTab
  },
  {
    id: 'users',
    label: 'Users',
    icon: UsersIcon,
    component: UsersTab
  },
  {
    id: 'software',
    label: 'Software',
    icon: PackageIcon,
    hasAlert: false,
    alertType: 'warning',
    component: SoftwareTab
  },
  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: AlertTriangleIcon,
    hasAlert: false,
    alertType: 'error',
    component: VulnerabilitiesTab
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: FileTextIcon,
    component: LogsTab
  }
]

export const getDeviceTab = (tabId: string): TabItem | undefined =>
  DEVICE_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType<{ device: any }> | null => {
  const tab = getDeviceTab(tabId)
  return tab?.component || null
}