'use client';

import { getTabComponent, TabContent, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { MONITORING_TABS } from './tabs/monitoring-tabs';

const TAB_IDS = ['policies', 'queries'] as const;
const DEFAULT_TAB = 'policies';

export function MonitoringView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? DEFAULT_TAB;
  const activeTab = (TAB_IDS as readonly string[]).includes(requestedTab) ? requestedTab : DEFAULT_TAB;

  // Controlled mode: URL is the single source of truth. Avoids a flicker bug
  // in TabNavigation's `urlSync` mode where its internal sync effect briefly
  // resets the active tab to the URL's previous value during navigation.
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col w-full -mt-4">
      <TabNavigation tabs={MONITORING_TABS} activeTab={activeTab} onTabChange={handleTabChange} showRightGradient>
        {tabId => <TabContent activeTab={tabId} TabComponent={getTabComponent(MONITORING_TABS, tabId)} />}
      </TabNavigation>
    </div>
  );
}
