'use client';

import { Chevron02RightIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDialogTableColumns } from '../../../tickets/components/dialog-table-columns';
import { useDialogVersion } from '../../../tickets/hooks/use-dialog-version';
import { useDialogsQuery } from '../../../tickets/hooks/use-dialogs-query';
import type { ClientDialogOwner, Dialog } from '../../../tickets/types/dialog.types';
import { useOrganizationLookup } from '../../hooks/use-organization-lookup';
import { OrganizationTabHeader } from './organization-tab-header';

interface OrganizationTicketsTabProps {
  organizationId: string;
  organizationName?: string;
}

function dialogBelongsToOrganization(dialog: Dialog, organizationId: string): boolean {
  if (dialog.organizationId === organizationId) return true;
  if ('machine' in (dialog.owner || {})) {
    const owner = dialog.owner as ClientDialogOwner;
    if (owner.machine?.organizationId === organizationId) return true;
  }
  return false;
}

export function OrganizationTicketsTab({ organizationId, organizationName }: OrganizationTicketsTabProps) {
  const router = useRouter();
  const dialogVersion = useDialogVersion();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Lazy organization lookup so the source column resolves names for the rows we display.
  const { lookup: organizationLookup, fetchOrganizationNames } = useOrganizationLookup();

  const { dialogs, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useDialogsQuery({
    archived: false,
    search: debouncedSearch,
  });

  // Filter to only this organization's tickets. The backend doesn't yet expose a
  // per-org filter on tickets, so we pull pages and filter client-side.
  const orgDialogs = useMemo(
    () => dialogs.filter(d => dialogBelongsToOrganization(d, organizationId)),
    [dialogs, organizationId],
  );

  useEffect(() => {
    // Seed the lookup with the org we're viewing so the source column has a name immediately.
    if (organizationName) {
      fetchOrganizationNames([organizationId]);
    }
  }, [organizationId, organizationName, fetchOrganizationNames]);

  const baseColumns = useMemo(
    () => getDialogTableColumns({ organizationLookup, isArchived: false, dialogVersion }),
    [organizationLookup, dialogVersion],
  );

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
      },
    ],
    [baseColumns],
  );

  const table = useDataTable<Dialog>({
    data: orgDialogs,
    columns,
    getRowId: (row: Dialog) => String(row.id),
    enableSorting: false,
  });

  const dialogRowHref = useCallback((d: Dialog) => `/tickets/dialog?id=${d.id}`, []);
  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <OrganizationTabHeader
        title="Tickets"
        rightActions={
          dialogVersion === 'v2' ? (
            <Button
              variant="card"
              onClick={() => router.push('/tickets/new')}
              leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
            >
              New Ticket
            </Button>
          ) : null
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
          rightSlot={<DataTable.RowCount itemName="ticket" totalCount={orgDialogs.length} />}
        />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={8}
          emptyMessage="No tickets found for this organization."
          rowHref={dialogRowHref}
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
