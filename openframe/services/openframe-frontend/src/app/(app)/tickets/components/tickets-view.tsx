'use client';

import { TableCellIcon, TableColIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { TicketsBoard } from './tickets-board';
import { CurrentTickets } from './tickets-table';

type ViewMode = 'table' | 'board';

export function TicketsView() {
  const { params, setParam } = useApiParams({
    status: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    assigneeIds: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'board' },
  });

  const viewMode: ViewMode = params.viewMode === 'table' ? 'table' : 'board';

  const handleStatusFilterChange = useCallback((status: string[]) => setParam('status', status), [setParam]);
  const handleOrganizationIdsChange = useCallback((ids: string[]) => setParam('organizationIds', ids), [setParam]);
  const handleAssigneeIdsChange = useCallback((ids: string[]) => setParam('assigneeIds', ids), [setParam]);

  const tabs = useMemo(
    () => (
      <TabSelector
        value={viewMode}
        onValueChange={v => setParam('viewMode', v as ViewMode)}
        items={[
          { id: 'table', icon: <TableCellIcon className="w-6 h-6" /> },
          { id: 'board', icon: <TableColIcon className="w-6 h-6" /> },
        ]}
      />
    ),
    [viewMode, setParam],
  );

  if (viewMode === 'board') {
    return (
      <TicketsBoard
        selector={tabs}
        organizationIds={params.organizationIds}
        onOrganizationIdsChange={handleOrganizationIdsChange}
        assigneeIds={params.assigneeIds}
        onAssigneeIdsChange={handleAssigneeIdsChange}
      />
    );
  }

  return (
    <CurrentTickets statusFilters={params.status} onStatusFilterChange={handleStatusFilterChange} selector={tabs} />
  );
}
