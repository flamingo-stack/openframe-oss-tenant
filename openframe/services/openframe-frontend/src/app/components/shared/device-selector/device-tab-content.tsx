import {
  Button,
  type ColumnDef,
  DataTable,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import type { Device } from '@/app/(app)/devices/types/device.types';
import type { DeviceTabContentProps } from './device-selector.types';

export function DeviceTabContent({
  mode,
  devices,
  columns,
  loading,
  renderRowActions,
  onAddAll,
  onRemoveAll,
  selectedCount,
  disabled,
  infiniteScroll,
  singleSelect,
}: DeviceTabContentProps) {
  // Convert legacy TableColumn<Device>[] to ColumnDef<Device>[] so this component
  // can keep its external contract (DeviceSelector still passes TableColumn[]).
  const dataTableColumns = useMemo<ColumnDef<Device>[]>(() => {
    const mapped: ColumnDef<Device>[] = columns.map(col => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      cell: ({ row }: { row: Row<Device> }) => col.renderCell?.(row.original, col),
      enableSorting: false,
      meta: {
        width: col.width,
        align: col.align,
        hideAt: col.hideAt,
      },
    }));

    mapped.push({
      id: 'actions',
      cell: ({ row }: { row: Row<Device> }) => (
        <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
          {renderRowActions(row.original)}
        </div>
      ),
      enableSorting: false,
      meta: { width: 'min-w-[130px] w-auto shrink-0 flex-none', align: 'right' },
    });

    return mapped;
  }, [columns, renderRowActions]);

  const table = useDataTable<Device>({
    data: devices,
    columns: dataTableColumns,
    getRowId: (row: Device) => String(row.id),
    enableSorting: false,
  });

  return (
    <>
      {!singleSelect && (
        <div className="flex justify-end -mb-2">
          {mode === 'available' ? (
            <Button
              variant="link"
              onClick={onAddAll}
              disabled={disabled}
              className="text-heading-4 font-medium text-ods-accent hover:text-ods-accent-hover"
            >
              Add All Devices
            </Button>
          ) : selectedCount > 0 ? (
            <Button
              variant="link"
              onClick={onRemoveAll}
              disabled={disabled}
              className="text-heading-4 font-medium text-ods-error hover:text-ods-error-hover"
            >
              Remove {selectedCount} Devices
            </Button>
          ) : null}
        </div>
      )}
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={loading}
          skeletonRows={8}
          emptyMessage={mode === 'selected' ? 'No devices selected' : 'No devices found'}
        />
        {infiniteScroll && (
          <DataTable.InfiniteFooter
            hasNextPage={infiniteScroll.hasNextPage}
            isFetchingNextPage={infiniteScroll.isFetchingNextPage}
            onLoadMore={infiniteScroll.onLoadMore}
            skeletonRows={infiniteScroll.skeletonRows}
          />
        )}
      </DataTable>
    </>
  );
}
