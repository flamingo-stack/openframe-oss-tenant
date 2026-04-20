'use client';

import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { TicketsTabNavigation } from './tabs';
import { TicketsTabContent } from './tabs/tickets-tab-content';

export function TicketsView() {
  const { params, setParam, setParams } = useApiParams({
    tab: { type: 'string', default: 'current' },
    status: { type: 'array', default: [] },
  });

  const handleTabChange = useCallback(
    (tab: string) => {
      setParams({ tab, status: [] });
    },
    [setParams],
  );

  return (
    <div className="flex flex-col w-full -mt-4">
      <TicketsTabNavigation activeTab={params.tab} onTabChange={handleTabChange} />
      <TicketsTabContent
        activeTab={params.tab}
        statusFilters={params.status}
        onStatusFilterChange={status => setParam('status', status)}
      />
    </div>
  );
}
