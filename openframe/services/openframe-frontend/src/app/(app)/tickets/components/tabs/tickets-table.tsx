'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { DataTable, ListPageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useArchiveResolvedMutation } from '../../hooks/use-archive-resolved-mutation';
import { useTicketStatistics } from '../../hooks/use-ticket-statistics';
import { useTicketsQuery } from '../../hooks/use-tickets-query';
import { getTicketTableColumns, TicketTableBody } from '../ticket-table-columns';

interface TicketsTableProps {
  isArchived: boolean;
  statusFilters?: string[];
  onStatusFilterChange?: (status: string[]) => void;
}

export function TicketsTable({ isArchived, statusFilters, onStatusFilterChange }: TicketsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const archiveResolvedMutation = useArchiveResolvedMutation();
  const { resolvedCount } = useTicketStatistics({ enabled: !isArchived });

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
        variant: 'outline' as const,
        icon: <BoxArchiveIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleArchiveResolved,
        disabled: archiveResolvedMutation.isPending || isLoading,
      });
    }
    if (!isArchived) {
      items.push({
        label: 'New Ticket',
        onClick: handleNewTicket,
        variant: 'outline' as const,
        icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
      });
    }
    return items;
  }, [
    handleNewTicket,
    hasResolvedTickets,
    handleArchiveResolved,
    archiveResolvedMutation.isPending,
    isLoading,
    isArchived,
  ]);

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

  return (
    <ListPageLayout
      title={title}
      searchPlaceholder="Search for Ticket"
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
      <TicketTableBody
        tickets={tickets}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        skeletonRows={10}
        stickyHeaderOffset="top-[96px]"
        isArchived={isArchived}
        footerSlot={
          <DataTable.InfiniteFooter
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleFetchNextPage}
            skeletonRows={2}
          />
        }
      />
    </ListPageLayout>
  );
}

export function CurrentTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={false} {...props} />;
}

export function ArchivedTickets(props: Omit<TicketsTableProps, 'isArchived'>) {
  return <TicketsTable isArchived={true} {...props} />;
}
