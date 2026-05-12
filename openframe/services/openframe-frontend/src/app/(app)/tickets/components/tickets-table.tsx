'use client';

import { Filter02Icon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnFiltersState,
  DataTable,
  FilterModal,
  Input,
  type OnChangeFn,
  PageError,
  PageLayout,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTicketsActions } from '../hooks/use-tickets-actions';
import { useTicketsQuery } from '../hooks/use-tickets-query';
import { getTicketTableColumns, TicketTableBody } from './ticket-table-columns';

interface TicketsTableProps {
  isArchived: boolean;
  statusFilters?: string[];
  onStatusFilterChange?: (status: string[]) => void;
  backButton?: { label?: string; onClick: () => void };
  selector?: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
}

export function TicketsTable({
  isArchived,
  statusFilters,
  onStatusFilterChange,
  backButton,
  selector,
  search,
  onSearchChange,
}: TicketsTableProps) {
  const debouncedSearch = useDebounce(search, 300);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const {
    dialogs: tickets,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useTicketsQuery({
    archived: isArchived,
    search: debouncedSearch,
    statusFilters,
  });

  const { actions, menuActions } = useTicketsActions({ isLoading, enabled: !isArchived });

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const columnFilters = useMemo<ColumnFiltersState>(
    () => (statusFilters && statusFilters.length > 0 ? [{ id: 'status', value: statusFilters }] : []),
    [statusFilters],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    updater => {
      if (isArchived) return;
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const nextStatus = (next.find(f => f.id === 'status')?.value as string[] | undefined) ?? [];
      onStatusFilterChange?.(nextStatus);
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [columnFilters, isArchived, onStatusFilterChange],
  );

  const handleMobileFilterChange = useCallback(
    (filters: Record<string, string[]>) => {
      if (isArchived) return;
      onStatusFilterChange?.(filters.status || []);
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [isArchived, onStatusFilterChange],
  );

  const title = isArchived ? 'Archived Tickets' : 'Tickets';
  const emptyMessage = isArchived
    ? 'No archived tickets found. Try adjusting your search or filters.'
    : 'No tickets found. Try adjusting your search or filters.';

  const filterGroups = useMemo(
    () =>
      getTicketTableColumns({ isArchived })
        .filter(column => column.meta?.filter?.options)
        .map(column => ({
          id: String(column.id ?? (column as { accessorKey?: string }).accessorKey ?? ''),
          title: typeof column.header === 'string' ? column.header : '',
          options: column.meta?.filter?.options || [],
        })),
    [isArchived],
  );

  const hasMobileFilter = filterGroups.length > 0;

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout
      title={title}
      backButton={backButton}
      actions={actions.length > 0 ? actions : undefined}
      menuActions={menuActions.length > 0 ? menuActions : undefined}
      actionsVariant="menu-primary"
      selector={selector}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col"
    >
      <div>
        <div className="sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]">
          <Input
            placeholder="Search for Ticket"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="flex-1"
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
          {hasMobileFilter && (
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filters"
              leftIcon={<Filter02Icon />}
            />
          )}
        </div>

        {hasMobileFilter && (
          <FilterModal
            isOpen={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            filterGroups={filterGroups}
            onFilterChange={handleMobileFilterChange}
            currentFilters={{ status: statusFilters || [] }}
          />
        )}

        <TicketTableBody
          tickets={tickets}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          skeletonRows={10}
          stickyHeaderOffset="top-[96px]"
          isArchived={isArchived}
          columnFilters={isArchived ? undefined : columnFilters}
          onColumnFiltersChange={isArchived ? undefined : onColumnFiltersChange}
          footerSlot={
            <DataTable.InfiniteFooter
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleFetchNextPage}
              skeletonRows={2}
            />
          }
        />
      </div>
    </PageLayout>
  );
}

export function CurrentTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={false} {...props} />;
}

export function ArchivedTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={true} {...props} />;
}
