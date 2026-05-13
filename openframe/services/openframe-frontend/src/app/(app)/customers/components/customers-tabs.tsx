'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import { BoxArchiveIcon, IdCardIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { CustomersTable } from './customers-table';

function ActiveCustomers() {
  return <CustomersTable status="ACTIVE" />;
}

function ArchivedCustomers() {
  return <CustomersTable status="ARCHIVED" />;
}

export const CUSTOMERS_TABS: TabItem[] = [
  {
    id: 'active',
    label: 'Active Customers',
    icon: IdCardIcon,
    component: ActiveCustomers,
  },
  {
    id: 'archived',
    label: 'Archived Customers',
    icon: BoxArchiveIcon,
    component: ArchivedCustomers,
  },
];

interface CustomersTabNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function CustomersTabNavigation({ activeTab, onTabChange }: CustomersTabNavigationProps) {
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
        tabs={CUSTOMERS_TABS}
        onTabChange={handleTabChange}
        showRightGradient
      />
    </div>
  );
}
