'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import { BoxArchiveIcon, TagsIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { OrganizationsTable } from './organizations-table';

function ActiveOrganizations() {
  return <OrganizationsTable status="ACTIVE" />;
}

function ArchivedOrganizations() {
  return <OrganizationsTable status="ARCHIVED" />;
}

export const ORGANIZATIONS_TABS: TabItem[] = [
  {
    id: 'active',
    label: 'Active',
    icon: TagsIcon,
    component: ActiveOrganizations,
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: BoxArchiveIcon,
    component: ArchivedOrganizations,
  },
];

interface OrganizationsTabNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function OrganizationsTabNavigation({ activeTab, onTabChange }: OrganizationsTabNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const defaultHandleTabChange = useCallback(
    (tabId: string) => {
      router.replace(`${pathname}?tab=${tabId}`);
    },
    [router, pathname],
  );

  const handleTabChange = onTabChange || defaultHandleTabChange;

  return (
    <TabNavigation
      urlSync={false}
      activeTab={activeTab || 'active'}
      tabs={ORGANIZATIONS_TABS}
      onTabChange={handleTabChange}
      showRightGradient
    />
  );
}
