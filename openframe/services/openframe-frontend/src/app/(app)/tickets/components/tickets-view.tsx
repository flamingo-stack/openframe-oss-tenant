'use client';

import { TableCellIcon, TableColIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { TicketsBoard } from './tickets-board';
import { CurrentTickets } from './tickets-table';

type ViewMode = 'table' | 'board';

export function TicketsView() {
  const isBoardEnabled = featureFlags.ticketsBoard.enabled();

  const { params, setParam } = useApiParams({
    status: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    assigneeIds: { type: 'array', default: [] },
    search: { type: 'string', default: '' },
    viewMode: { type: 'string', default: isBoardEnabled ? 'board' : 'table' },
  });

  const viewMode: ViewMode = isBoardEnabled && params.viewMode === 'board' ? 'board' : 'table';

  const handleStatusFilterChange = useCallback((status: string[]) => setParam('status', status), [setParam]);
  const handleOrganizationIdsChange = useCallback((ids: string[]) => setParam('organizationIds', ids), [setParam]);
  const handleAssigneeIdsChange = useCallback((ids: string[]) => setParam('assigneeIds', ids), [setParam]);
  const handleSearchChange = useCallback((value: string) => setParam('search', value), [setParam]);

  const tabs = useMemo(
    () =>
      isBoardEnabled ? (
        <TabSelector
          value={viewMode}
          onValueChange={v => setParam('viewMode', v as ViewMode)}
          items={[
            { id: 'table', icon: <TableCellIcon className="w-6 h-6" /> },
            { id: 'board', icon: <TableColIcon className="w-6 h-6" /> },
          ]}
        />
      ) : null,
    [isBoardEnabled, viewMode, setParam],
  );

  if (viewMode === 'board') {
    return (
      <TicketsBoard
        selector={tabs}
        organizationIds={params.organizationIds}
        onOrganizationIdsChange={handleOrganizationIdsChange}
        assigneeIds={params.assigneeIds}
        onAssigneeIdsChange={handleAssigneeIdsChange}
        search={params.search}
        onSearchChange={handleSearchChange}
      />
    );
  }

  return (
    <CurrentTickets
      statusFilters={params.status}
      onStatusFilterChange={handleStatusFilterChange}
      selector={tabs}
      search={params.search}
      onSearchChange={handleSearchChange}
    />
  );
}
