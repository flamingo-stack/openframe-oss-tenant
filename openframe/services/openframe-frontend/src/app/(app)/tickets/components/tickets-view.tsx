'use client';

import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { CurrentTickets } from './tickets-table';

export function TicketsView() {
  const { params, setParam } = useApiParams({
    status: { type: 'array', default: [] },
  });

  const handleStatusFilterChange = useCallback((status: string[]) => setParam('status', status), [setParam]);

  return <CurrentTickets statusFilters={params.status} onStatusFilterChange={handleStatusFilterChange} />;
}
