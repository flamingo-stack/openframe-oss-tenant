'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import { BoxArchiveIcon, IdCardIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
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
    label: 'Active Organizations',
    icon: IdCardIcon,
    component: ActiveOrganizations,
  },
  {
    id: 'archived',
    label: 'Archived Organizations',
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
    <div className="px-[var(--spacing-system-l)]">
      <TabNavigation
        urlSync={false}
        activeTab={activeTab || 'active'}
        tabs={ORGANIZATIONS_TABS}
        onTabChange={handleTabChange}
        showRightGradient
      />
    </div>
  );
}
