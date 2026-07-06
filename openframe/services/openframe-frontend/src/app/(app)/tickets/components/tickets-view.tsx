'use client';

import { TableCellIcon, TableColIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { TicketsBoard } from './tickets-board';
import { CurrentTickets } from './tickets-table';

type ViewMode = 'table' | 'board';

export function TicketsView() {
  const { params, setParam, setParams } = useApiParams({
    status: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    assigneeIds: { type: 'array', default: [] },
    labelIds: { type: 'array', default: [] },
    search: { type: 'string', default: '' },
    viewMode: { type: 'string', default: 'board' },
  });

  const viewMode: ViewMode = params.viewMode === 'board' ? 'board' : 'table';

  // Local search keeps typing responsive; the shared hook debounces the write to
  // the URL param so we don't navigate the router (and re-render the board) on
  // every keystroke.
  const { search, setSearch } = useSearchParam(params.search, value => setParam('search', value), 300);

  const handleStatusFilterChange = useCallback((status: string[]) => setParam('status', status), [setParam]);
  const handleOrganizationIdsChange = useCallback((ids: string[]) => setParam('organizationIds', ids), [setParam]);
  const handleAssigneeIdsChange = useCallback((ids: string[]) => setParam('assigneeIds', ids), [setParam]);
  const handleLabelIdsChange = useCallback((ids: string[]) => setParam('labelIds', ids), [setParam]);
  // Single URL write: two sequential setParam calls read the same snapshot and clobber each other.
  const handleFiltersChange = useCallback(
    (filters: { organizationIds: string[]; assigneeIds: string[] }) => setParams(filters),
    [setParams],
  );

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
        labelIds={params.labelIds}
        onLabelIdsChange={handleLabelIdsChange}
        onFiltersChange={handleFiltersChange}
        search={search}
        onSearchChange={setSearch}
      />
    );
  }

  return (
    <CurrentTickets
      statusFilters={params.status}
      onStatusFilterChange={handleStatusFilterChange}
      selector={tabs}
      labelIds={params.labelIds}
      onLabelIdsChange={handleLabelIdsChange}
      search={search}
      onSearchChange={setSearch}
    />
  );
}
