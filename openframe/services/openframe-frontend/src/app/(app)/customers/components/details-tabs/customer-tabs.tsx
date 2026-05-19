'use client';

import {
  ClipboardListIcon,
  FileContentIcon,
  MonitorIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import type { CustomerDetails } from '../../hooks/use-customer-details';
import { CustomerDetailsTab } from './customer-details-tab';
import { CustomerDevicesTab } from './customer-devices-tab';
import { CustomerLogsTab } from './customer-logs-tab';
import { CustomerTicketsTab } from './customer-tickets-tab';

export interface CustomerTabProps {
  organization: CustomerDetails;
}

// Module-level wrapper components keep their function identities stable across
// renders — required so React doesn't unmount/mount the active tab whenever
// the parent re-renders, and so TabNavigation's internal effect (which depends
// on the `tabs` reference) doesn't briefly reset the active tab during a
// navigation transition.

function DevicesTab({ organization }: CustomerTabProps) {
  return <CustomerDevicesTab organizationId={organization.organizationId} />;
}

function TicketsTab({ organization }: CustomerTabProps) {
  return <CustomerTicketsTab organizationId={organization.organizationId} />;
}

function LogsTab({ organization }: CustomerTabProps) {
  return <CustomerLogsTab organizationId={organization.organizationId} />;
}

function DetailsTab({ organization }: CustomerTabProps) {
  return <CustomerDetailsTab organization={organization} />;
}

export const CUSTOMER_TABS: TabItem[] = [
  { id: 'devices', label: 'Devices', icon: MonitorIcon, component: DevicesTab },
  { id: 'tickets', label: 'Tickets', icon: TagIcon, component: TicketsTab },
  { id: 'logs', label: 'Logs', icon: ClipboardListIcon, component: LogsTab },
  { id: 'details', label: 'Details', icon: FileContentIcon, component: DetailsTab },
];

export const getCustomerTab = (tabId: string): TabItem | undefined => CUSTOMER_TABS.find(tab => tab.id === tabId);

export const getCustomerTabComponent = (tabId: string): ComponentType<CustomerTabProps> | null => {
  const tab = getCustomerTab(tabId);
  return (tab?.component as ComponentType<CustomerTabProps>) || null;
};
