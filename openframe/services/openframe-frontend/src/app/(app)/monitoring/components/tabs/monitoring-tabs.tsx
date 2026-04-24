'use client';

import { type TabItem } from '@flamingo-stack/openframe-frontend-core';
import {
  BracketCurlyEllipsisVrIcon,
  FolderShieldIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Policies } from './policies';
import { Queries } from './queries';

export const MONITORING_TABS: TabItem[] = [
  {
    id: 'policies',
    label: 'Policies',
    icon: FolderShieldIcon,
    component: Policies,
  },
  {
    id: 'queries',
    label: 'Queries',
    icon: BracketCurlyEllipsisVrIcon,
    component: Queries,
  },
];

export const getMonitoringTab = (tabId: string): TabItem | undefined => MONITORING_TABS.find(tab => tab.id === tabId);

export const getTabComponent = (tabId: string): React.ComponentType | null => {
  const tab = getMonitoringTab(tabId);
  return tab?.component || null;
};
