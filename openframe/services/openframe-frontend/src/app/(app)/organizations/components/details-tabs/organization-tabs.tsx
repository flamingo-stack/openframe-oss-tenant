'use client';

import {
  ClipboardListIcon,
  FileContentIcon,
  MonitorIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import type { OrganizationDetails } from '../../hooks/use-organization-details';
import { OrganizationDetailsTab } from './organization-details-tab';
import { OrganizationDevicesTab } from './organization-devices-tab';
import { OrganizationLogsTab } from './organization-logs-tab';
import { OrganizationTicketsTab } from './organization-tickets-tab';

export interface OrganizationTabProps {
  organization: OrganizationDetails;
}

// Module-level wrapper components keep their function identities stable across
// renders — required so React doesn't unmount/mount the active tab whenever
// the parent re-renders, and so TabNavigation's internal effect (which depends
// on the `tabs` reference) doesn't briefly reset the active tab during a
// navigation transition.

function DevicesTab({ organization }: OrganizationTabProps) {
  return <OrganizationDevicesTab organizationId={organization.organizationId} />;
}

function TicketsTab({ organization }: OrganizationTabProps) {
  return <OrganizationTicketsTab organizationId={organization.organizationId} organizationName={organization.name} />;
}

function LogsTab({ organization }: OrganizationTabProps) {
  return <OrganizationLogsTab organizationId={organization.organizationId} />;
}

function DetailsTab({ organization }: OrganizationTabProps) {
  return <OrganizationDetailsTab organization={organization} />;
}

export const ORGANIZATION_TABS: TabItem[] = [
  { id: 'devices', label: 'Devices', icon: MonitorIcon, component: DevicesTab },
  { id: 'tickets', label: 'Tickets', icon: TagIcon, component: TicketsTab },
  { id: 'logs', label: 'Logs', icon: ClipboardListIcon, component: LogsTab },
  { id: 'details', label: 'Details', icon: FileContentIcon, component: DetailsTab },
];

export const getOrganizationTab = (tabId: string): TabItem | undefined =>
  ORGANIZATION_TABS.find(tab => tab.id === tabId);

export const getOrganizationTabComponent = (tabId: string): ComponentType<OrganizationTabProps> | null => {
  const tab = getOrganizationTab(tabId);
  return (tab?.component as ComponentType<OrganizationTabProps>) || null;
};
