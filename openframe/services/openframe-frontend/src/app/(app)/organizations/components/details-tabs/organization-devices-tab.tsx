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
import { useCallback, useMemo, useState } from 'react';
import { getDeviceTableColumns, getDeviceTableRowActions } from '../../../devices/components/devices-table-columns';
import { useDevices } from '../../../devices/hooks/use-devices';
import type { Device } from '../../../devices/types/device.types';
import { OrganizationTabHeader } from './organization-tab-header';

interface OrganizationDevicesTabProps {
  organizationId: string;
}

export function OrganizationDevicesTab({ organizationId }: OrganizationDevicesTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(() => ({ organizationIds: [organizationId] }), [organizationId]);

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, filteredCount, refetch } =
    useDevices(filters, debouncedSearch);

  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

  const baseColumns = useMemo(() => getDeviceTableColumns(null), []);

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      // Drop the organization column — every row belongs to the same org on this page.
      ...baseColumns.filter(col => col.id !== 'organization'),
      {
        id: 'actions',
        cell: ({ row }: { row: Row<Device> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<Device> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={`/devices/details/${row.original.machineId || row.original.id}`}
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
    [baseColumns, renderRowActions],
  );

  const table = useDataTable<Device>({
    data: devices,
    columns,
    getRowId: (row: Device) => String(row.machineId ?? row.id),
    enableSorting: false,
  });

  const deviceRowHref = useCallback((d: Device) => `/devices/details/${d.machineId || d.id}`, []);
  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <OrganizationTabHeader
        title="Devices"
        rightActions={
          <Button
            variant="card"
            onClick={() => router.push(`/devices/new?organizationId=${organizationId}`)}
            leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
          >
            Add Device
          </Button>
        }
      />

      {/* Sticky search row — vertical `py/-my` of `spacing-l` extends bg above
          and below without adding layout space. When pinned, the bar has
          breathing room on top, and the DataTable header (sticky at top-[96px]
          = 24 + 48 + 24) docks flush below. */}
      <div className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search for Devices" />
      </div>

      <DataTable table={table}>
        <DataTable.Header
          stickyHeader
          stickyHeaderOffset="top-[96px]"
          rightSlot={<DataTable.RowCount itemName="device" totalCount={filteredCount} />}
        />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={8}
          emptyMessage="No devices found for this organization."
          rowHref={deviceRowHref}
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
