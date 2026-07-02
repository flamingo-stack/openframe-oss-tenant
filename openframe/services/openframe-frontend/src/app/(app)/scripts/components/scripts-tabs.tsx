'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import { BracketCurlyIcon, CalendarIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { ScriptSchedulesTable } from './script-schedules-table';
import { ScriptsTable } from './scripts-table';

export const SCRIPTS_TABS: TabItem[] = [
  {
    id: 'list',
    label: 'Scripts List',
    icon: BracketCurlyIcon,
    component: ScriptsTable,
  },
  {
    id: 'schedules',
    label: 'Scripts Schedules',
    icon: CalendarIcon,
    component: ScriptSchedulesTable,
  },
];

interface ScriptsTabNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function ScriptsTabNavigation({ activeTab, onTabChange }: ScriptsTabNavigationProps) {
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
        activeTab={activeTab || 'list'}
        tabs={SCRIPTS_TABS}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
