'use client';

import {
  BoxArchiveIcon,
  Chevron02RightIcon,
  PlusCircleIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  ListPageLayout,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganizationLookup } from '../../../organizations/hooks/use-organization-lookup';
import { useArchiveResolvedMutation } from '../../hooks/use-archive-resolved-mutation';
import { useDialogVersion } from '../../hooks/use-dialog-version';
import { useDialogsQuery } from '../../hooks/use-dialogs-query';
import { useTicketStatistics } from '../../hooks/use-ticket-statistics';
import type { ClientDialogOwner, Dialog } from '../../types/dialog.types';
import { getDialogTableColumns } from '../dialog-table-columns';

interface ChatsTableProps {
  isArchived: boolean;
  statusFilters?: string[];
  onStatusFilterChange?: (status: string[]) => void;
}

export function ChatsTable({ isArchived, statusFilters, onStatusFilterChange }: ChatsTableProps) {
  const router = useRouter();
  const dialogVersion = useDialogVersion();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Lazy organization lookup - doesn't block initial render
  const { lookup: organizationLookup, fetchOrganizationNames } = useOrganizationLookup();
  const archiveResolvedMutation = useArchiveResolvedMutation();
  const { resolvedCount } = useTicketStatistics({ enabled: !isArchived });

  const { dialogs, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useDialogsQuery({
    archived: isArchived,
    search: debouncedSearch,
    statusFilters,
  });

  useEffect(() => {
    if (dialogs.length === 0) return;

    // Extract unique organization IDs from loaded dialogs
    const organizationIds = dialogs
      .map((dialog: Dialog) => {
        const isClientOwner = 'machine' in (dialog.owner || {});
        if (isClientOwner) {
          const clientOwner = dialog.owner as ClientDialogOwner;
          return clientOwner.machine?.organizationId;
        }
        return undefined;
      })
      .filter((id: string | undefined): id is string => !!id);

    // Dedupe
    const uniqueIds = Array.from(new Set(organizationIds));

    if (uniqueIds.length > 0) {
      fetchOrganizationNames(uniqueIds as string[]);
    }
  }, [dialogs, fetchOrganizationNames]);

  const columns = useMemo<ColumnDef<Dialog>[]>(() => {
    const baseColumns = getDialogTableColumns({ organizationLookup, isArchived, dialogVersion });
    const chevronColumn: ColumnDef<Dialog> = {
      id: 'open',
      cell: ({ row }: { row: Row<Dialog> }) => (
        <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
          <Button
            href={`/tickets/dialog?id=${row.original.id}`}
            prefetch={false}
            variant="outline"
            size="icon"
            centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
            aria-label="View details"
            className="bg-ods-card"
          />
        </div>
      ),
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
    };
    return [...baseColumns, chevronColumn];
  }, [organizationLookup, isArchived, dialogVersion]);

  const table = useDataTable<Dialog>({
    data: dialogs,
    columns,
    getRowId: (row: Dialog) => String(row.id),
    enableSorting: false,
  });

  const dialogRowHref = useCallback((dialog: Dialog) => `/tickets/dialog?id=${dialog.id}`, []);

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const handleArchiveResolved = useCallback(async () => {
    await archiveResolvedMutation.mutateAsync();
  }, [archiveResolvedMutation]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, string[]>) => {
      if (isArchived) return;

      const newStatusFilters = columnFilters.status || [];

      if (onStatusFilterChange) {
        onStatusFilterChange(newStatusFilters);
      }

      // Scroll to top on filter change
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [isArchived, onStatusFilterChange],
  );

  const hasResolvedTickets = !isArchived && resolvedCount > 0;

  const title = isArchived ? 'Archived Tickets' : 'Tickets';
  const emptyMessage = isArchived
    ? 'No archived tickets found. Try adjusting your search or filters.'
    : 'No tickets found. Try adjusting your search or filters.';

  const handleNewTicket = useCallback(() => {
    router.push('/tickets/new');
  }, [router]);

  const actions = useMemo(() => {
    const items = [];
    if (hasResolvedTickets) {
      items.push({
        label: 'Archive Resolved',
        variant: 'card' as const,
        icon: <BoxArchiveIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleArchiveResolved,
        disabled: archiveResolvedMutation.isPending || isLoading,
      });
    }
    if (dialogVersion === 'v2' && !isArchived) {
      items.push({
        label: 'New Ticket',
        onClick: handleNewTicket,
        variant: 'card' as const,
        icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
      });
    }
    return items;
  }, [
    dialogVersion,
    handleNewTicket,
    hasResolvedTickets,
    handleArchiveResolved,
    archiveResolvedMutation.isPending,
    isLoading,
    isArchived,
  ]);

  const filterGroups = columns
    .filter(column => column.meta?.filter?.options)
    .map(column => ({
      id: String(column.id ?? (column as { accessorKey?: string }).accessorKey ?? ''),
      title: typeof column.header === 'string' ? column.header : '',
      options: column.meta?.filter?.options || [],
    }));

  return (
    <ListPageLayout
      title={title}
      searchPlaceholder="Search for Chat"
      searchValue={search}
      onSearch={setSearch}
      error={error}
      padding="none"
      className="pt-6"
      actions={actions.length > 0 ? actions : undefined}
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      // TODO: This is a hack to get the filters to work, replace in future
      currentMobileFilters={{ status: statusFilters || [] }}
      stickyHeader
    >
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[56px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={10}
          emptyMessage={emptyMessage}
          rowClassName="mb-1"
          rowHref={dialogRowHref}
        />
        <DataTable.InfiniteFooter
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleFetchNextPage}
          skeletonRows={2}
        />
      </DataTable>
    </ListPageLayout>
  );
}

// Wrapper components for tab navigation
export function CurrentChats(props: Omit<ChatsTableProps, 'isArchived'>) {
  return <ChatsTable isArchived={false} {...props} />;
}

export function ArchivedChats(props: Omit<ChatsTableProps, 'isArchived'>) {
  return <ChatsTable isArchived={true} {...props} />;
}
