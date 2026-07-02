'use client';

import {
  // BracketCurlyEllipsisVrIcon, // Queries tab temporarily disabled
  BracketSquareCheckIcon,
  FolderShieldIcon,
  HardDrivesIcon,
  Hierarchy02Icon,
  Menu02Icon,
  ShieldIcon,
  TagIcon,
  TerminalBrowserIcon,
  TerminalMonitorIcon,
  UsersIcon,
  WebDesignIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { AgentsTab } from './agents-tab';
import { HardwareTab } from './hardware-tab';
import { NetworkTab } from './network-tab';
import { OsTab } from './os-tab';
import { OverviewTab } from './overview-tab';
import { PoliciesTab } from './policies-tab';
// import { QueriesTab } from './queries-tab'; // Queries tab temporarily disabled
import { SecurityTab } from './security-tab';
import { SoftwareTab } from './software-tab';
import { TicketsTab } from './tickets-tab';
import { UsersTab } from './users-tab';
import { VulnerabilitiesTab } from './vulnerabilities-tab';

export const DEVICE_TABS: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Menu02Icon,
    component: OverviewTab,
  },
  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: BracketSquareCheckIcon,
    component: VulnerabilitiesTab,
  },
  {
    id: 'policies',
    label: 'Policies',
    icon: FolderShieldIcon,
    component: PoliciesTab,
  },
  // Queries tab temporarily disabled.
  // {
  //   id: 'queries',
  //   label: 'Queries',
  //   icon: BracketCurlyEllipsisVrIcon,
  //   component: QueriesTab,
  // },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldIcon,
    component: SecurityTab,
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: TerminalBrowserIcon,
    component: AgentsTab,
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: TagIcon,
    component: TicketsTab,
  },
  {
    id: 'hardware',
    label: 'Hardware',
    icon: HardDrivesIcon,
    component: HardwareTab,
  },
  {
    id: 'os',
    label: 'OS',
    icon: TerminalMonitorIcon,
    component: OsTab,
  },
  {
    id: 'network',
    label: 'Network',
    icon: Hierarchy02Icon,
    component: NetworkTab,
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
];
