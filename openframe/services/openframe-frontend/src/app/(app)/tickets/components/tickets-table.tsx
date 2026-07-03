'use client';

import { useOptionalNotifications } from '@flamingo-stack/openframe-frontend-core';
import { Filter02Icon, TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnFiltersState,
  DataTable,
  FilterModal,
  type OnChangeFn,
  PageError,
  PageLayout,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/shared';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { emphasizeNewTicketAction, useTicketsActions } from '../hooks/use-tickets-actions';
import { useTicketsQuery } from '../hooks/use-tickets-query';
import { useTicketStatusesQuery } from '../statuses/hooks/use-ticket-statuses-query';
import type { Dialog } from '../types/dialog.types';
import { TicketTagFilter } from './ticket-label-filter';
import { getTicketTableColumns, type StatusFilterOption, TicketTableBody } from './ticket-table-columns';

// TODO(unread-from-entity): re-enable per-ticket unread highlighting once the backend exposes
// unread counts on the ticket entity itself. Matching unread notifications to tickets by id is a
// temporary workaround — disabled for now; flip this flag to restore it.
const HIGHLIGHT_UNREAD_FROM_NOTIFICATIONS: boolean = false;

interface TicketsTableProps {
  isArchived: boolean;
  statusFilters?: string[];
  onStatusFilterChange?: (status: string[]) => void;
  backButton?: { label?: string; onClick: () => void };
  selector?: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
  labelIds: string[];
  onLabelIdsChange: (ids: string[]) => void;
}

export function TicketsTable({
  isArchived,
  statusFilters,
  onStatusFilterChange,
  backButton,
  selector,
  search,
  onSearchChange,
  labelIds,
  onLabelIdsChange,
}: TicketsTableProps) {
  const debouncedSearch = useDebounce(search, 300);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

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
    labelIds,
  });

  const archiveFilter = useMemo(() => ({ labelIds }), [labelIds]);
  const {
    actions: baseActions,
    menuActions,
    dialog: ticketsActionsDialog,
  } = useTicketsActions({ isLoading, enabled: !isArchived, filter: archiveFilter });

  // Tickets have no unread field of their own; the per-row count comes from notifications (a
  // separate entity) matched by ticket id, mirroring how the Mingo sidebar derives per-dialog
  // unread badges. Opening a ticket marks those read (EntityViewAutoReader), clearing the badge.
  const notifications = useOptionalNotifications();
  const unreadByTicketId = useMemo(() => {
    const counts = new Map<string, number>();
    if (!HIGHLIGHT_UNREAD_FROM_NOTIFICATIONS) return counts;
    for (const notification of notifications?.notifications ?? []) {
      if (notification.read) continue;
      const ticketId = notification.meta?.ticketId;
      if (typeof ticketId === 'string') counts.set(ticketId, (counts.get(ticketId) ?? 0) + 1);
    }
    return counts;
  }, [notifications?.notifications]);
  const getUnreadCount = useCallback((ticket: Dialog) => unreadByTicketId.get(ticket.id), [unreadByTicketId]);

  // Status filter options (value = status id).
  const statusesQuery = useTicketStatusesQuery({ enabled: !isArchived });
  const statusOptions = useMemo<StatusFilterOption[] | undefined>(() => {
    if (isArchived) return undefined;
    return (statusesQuery.data?.snapshot ?? [])
      .filter(s => s.kind !== 'ARCHIVED')
      .map(s => ({ id: s.id, value: s.id, label: s.name }));
  }, [isArchived, statusesQuery.data]);

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
      getTicketTableColumns({ isArchived, statusOptions })
        .filter(column => column.meta?.filter?.options)
        .map(column => ({
          id: String(column.id ?? (column as { accessorKey?: string }).accessorKey ?? ''),
          title: typeof column.header === 'string' ? column.header : '',
          options: column.meta?.filter?.options || [],
        })),
    [isArchived, statusOptions],
  );

  const hasMobileFilter = filterGroups.length > 0;

  const showEmptyState =
    !isLoading &&
    !debouncedSearch &&
    (statusFilters?.length ?? 0) === 0 &&
    labelIds.length === 0 &&
    tickets.length === 0;

  const actions = useMemo(() => emphasizeNewTicketAction(baseActions, showEmptyState), [baseActions, showEmptyState]);

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <>
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
        <div style={containerStyle}>
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 flex flex-col gap-[var(--spacing-system-xxs)] bg-ods-bg -mx-[var(--spacing-system-l)] px-[var(--spacing-system-l)] pt-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
          >
            <TicketTagFilter
              search={search}
              onSearchChange={onSearchChange}
              labelIds={labelIds}
              onLabelIdsChange={onLabelIdsChange}
              filterButton={
                hasMobileFilter ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileFilterOpen(true)}
                    aria-label="Open filters"
                    leftIcon={<Filter02Icon />}
                  />
                ) : undefined
              }
            />
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

          {showEmptyState ? (
            <EmptyState
              icon={<TagIcon />}
              title="Ticket history empty"
              description="Tickets will appear here when available"
            />
          ) : (
            <TicketTableBody
              tickets={tickets}
              isLoading={isLoading}
              emptyMessage={emptyMessage}
              skeletonRows={10}
              stickyHeaderOffset={stickyHeaderOffset}
              isArchived={isArchived}
              statusOptions={statusOptions}
              columnFilters={isArchived ? undefined : columnFilters}
              onColumnFiltersChange={isArchived ? undefined : onColumnFiltersChange}
              getUnreadCount={getUnreadCount}
              footerSlot={
                <DataTable.InfiniteFooter
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={handleFetchNextPage}
                  skeletonRows={2}
                />
              }
            />
          )}
        </div>
      </PageLayout>
      {ticketsActionsDialog}
    </>
  );
}

export function CurrentTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={false} {...props} />;
}

export function ArchivedTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={true} {...props} />;
}
