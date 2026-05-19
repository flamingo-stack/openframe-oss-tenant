'use client';

import { ArrowRightUpIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  PageError,
  type Row,
  SearchInput,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { getTicketTableColumns } from '../../../tickets/components/ticket-table-columns';
import { useTicketsQuery } from '../../../tickets/hooks/use-tickets-query';
import type { ClientDialogOwner, Dialog } from '../../../tickets/types/dialog.types';
import { CustomerTabHeader } from './customer-tab-header';

interface CustomerTicketsTabProps {
  organizationId: string;
}

function ticketBelongsToOrganization(ticket: Dialog, organizationId: string): boolean {
  if (ticket.organizationId === organizationId) return true;
  if ('machine' in (ticket.owner || {})) {
    const owner = ticket.owner as ClientDialogOwner;
    if (owner.machine?.organizationId === organizationId) return true;
  }
  return false;
}

export function CustomerTicketsTab({ organizationId }: CustomerTicketsTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    dialogs: tickets,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useTicketsQuery({
    archived: false,
    search: debouncedSearch,
  });

  const orgTickets = useMemo(
    () => tickets.filter(t => ticketBelongsToOrganization(t, organizationId)),
    [tickets, organizationId],
  );

  const baseColumns = useMemo(() => getTicketTableColumns({ isArchived: false }), []);

  const columns = useMemo<ColumnDef<Dialog>[]>(
    () => [
      ...baseColumns,
      {
        id: 'open',
        cell: ({ row }: { row: Row<Dialog> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={`/tickets/dialog?id=${row.original.id}`}
              prefetch={false}
              openInNewTab
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [baseColumns],
  );

  const table = useDataTable<Dialog>({
    data: orgTickets,
    columns,
    getRowId: (row: Dialog) => String(row.id),
    enableSorting: false,
  });

  const ticketRowHref = useCallback((t: Dialog) => `/tickets/dialog?id=${t.id}`, []);
  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <CustomerTabHeader
        title="Tickets"
        rightActions={
          <Button
            variant="outline"
            onClick={() => router.push('/tickets/new')}
            leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
          >
            New Ticket
          </Button>
        }
      />

      {/* Sticky search row — vertical `py/-my` of `spacing-l` extends bg above
          and below without adding layout space. When pinned, the bar has
          breathing room on top, and the DataTable header (sticky at top-[96px]
          = 24 + 48 + 24) docks flush below. */}
      <div className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search for Tickets" />
      </div>

      <DataTable table={table}>
        <DataTable.Header
          stickyHeader
          stickyHeaderOffset="top-[96px]"
          rightSlot={<DataTable.RowCount itemName="ticket" totalCount={orgTickets.length} />}
        />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={8}
          emptyMessage="No tickets found for this customer."
          rowHref={ticketRowHref}
          rowClassName="mb-1"
        />
        <DataTable.InfiniteFooter
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          skeletonRows={2}
        />
      </DataTable>
    </div>
  );
}
