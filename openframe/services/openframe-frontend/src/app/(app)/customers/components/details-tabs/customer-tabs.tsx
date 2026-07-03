'use client';

import {
  ChatsIcon,
  ClipboardListIcon,
  ClockHistoryIcon,
  FileContentIcon,
  MonitorIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import type { CustomerDetails } from '../../hooks/use-customer-details';
import { CustomerCustomAiAssistantTab } from './customer-custom-ai-assistant-tab';
import { CustomerDetailsTab } from './customer-details-tab';
import { CustomerDevicesTab } from './customer-devices-tab';
import { CustomerLogsTab } from './customer-logs-tab';
import { CustomerTicketsTab } from './customer-tickets-tab';
import { CustomerWorktimeTab } from './customer-worktime-tab';

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

function WorktimeTab({ organization }: CustomerTabProps) {
  return <CustomerWorktimeTab organization={organization} />;
}

function DetailsTab({ organization }: CustomerTabProps) {
  return <CustomerDetailsTab organization={organization} />;
}

function CustomAiAssistantTab({ organization }: CustomerTabProps) {
  return <CustomerCustomAiAssistantTab organizationId={organization.organizationId} />;
}

export const CUSTOM_AI_ASSISTANT_TAB_ID = 'custom-ai-assistant';

const BASE_CUSTOMER_TABS: TabItem[] = [
  { id: 'devices', label: 'Devices', icon: MonitorIcon, component: DevicesTab },
  { id: 'tickets', label: 'Tickets', icon: TagIcon, component: TicketsTab },
  { id: 'logs', label: 'Logs', icon: ClipboardListIcon, component: LogsTab },
  { id: 'worktime', label: 'Worktime', icon: ClockHistoryIcon, component: WorktimeTab },
  { id: 'details', label: 'Details', icon: FileContentIcon, component: DetailsTab },
];

const CUSTOM_AI_ASSISTANT_TAB: TabItem = {
  id: CUSTOM_AI_ASSISTANT_TAB_ID,
  label: 'Custom AI Assistant',
  icon: ChatsIcon,
  component: CustomAiAssistantTab,
};

// Superset used to resolve the active tab's component regardless of visibility.
const ALL_CUSTOMER_TABS: TabItem[] = [...BASE_CUSTOMER_TABS, CUSTOM_AI_ASSISTANT_TAB];

/**
 * Tabs shown for a customer. The Custom AI Assistant tab is appended only when
 * the customer has a custom appearance override (`showCustomAiAssistant`).
 */
export const getCustomerTabs = (showCustomAiAssistant: boolean): TabItem[] =>
  showCustomAiAssistant ? ALL_CUSTOMER_TABS : BASE_CUSTOMER_TABS;

export const getCustomerTab = (tabId: string): TabItem | undefined => ALL_CUSTOMER_TABS.find(tab => tab.id === tabId);

export const getCustomerTabComponent = (tabId: string): ComponentType<CustomerTabProps> | null => {
  const tab = getCustomerTab(tabId);
  return (tab?.component as ComponentType<CustomerTabProps>) || null;
};
