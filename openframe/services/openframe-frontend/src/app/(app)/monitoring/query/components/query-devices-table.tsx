'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  ArrowRightUpIcon,
  Filter02Icon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  EntityImage,
  FilterModal,
  Input,
  multiSelectFilterFn,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMdUp } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo, useState } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
import { getDeviceStatusConfig } from '../../../devices/utils/device-status';
import { useQueryDevicesTable } from '../hooks/use-query-devices-table';
import type { QueryDeviceRow } from '../types/query-device-row';

interface QueryDevicesTableProps {
  queryId: number;
}

export function QueryDevicesTable({ queryId }: QueryDevicesTableProps) {
  const { rows, isLoading } = useQueryDevicesTable(queryId);
  const isMdUp = useMdUp();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Device tags grouped by key → values, for the "Device Tags" FilterModal
  // (same shape the /devices tag filter modal consumes).
  const tagFilterKeys = useMemo(() => {
    const grouped = new Map<string, Map<string, { id: string; label: string }>>();
    for (const row of rows) {
      for (const tag of row.tags) {
        if (!grouped.has(tag.key)) grouped.set(tag.key, new Map());
        const values = grouped.get(tag.key)!;
        if (!values.has(tag.value)) values.set(tag.value, { id: tag.value, label: tag.value });
      }
    }
    return Array.from(grouped, ([key, values]) => ({
      key,
      label: key,
      values: Array.from(values.values()).sort((a, b) => a.label.localeCompare(b.label)),
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => {
      const matchesSearch =
        term.length === 0 ||
        row.displayName.toLowerCase().includes(term) ||
        row.hostname.toLowerCase().includes(term) ||
        (row.organization?.toLowerCase().includes(term) ?? false);
      const matchesTags =
        selectedTags.length === 0 || row.tags.some(tag => selectedTags.includes(`${tag.key}:${tag.value}`));
      return matchesSearch && matchesTags;
    });
  }, [rows, search, selectedTags]);

  // Column-header filter options, built from the full assigned-device set so the
  // choices stay stable regardless of the active search/tag/column filters.
  const statusOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const row of rows) {
      if (!seen.has(row.status)) {
        seen.set(row.status, { id: row.status, label: getDeviceStatusConfig(row.status).label, value: row.status });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const osOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const row of rows) {
      if (row.osType && !seen.has(row.osType)) {
        seen.set(row.osType, { id: row.osType, label: row.osType, value: row.osType });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const customerOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const row of rows) {
      if (row.organization && !seen.has(row.organization)) {
        seen.set(row.organization, { id: row.organization, label: row.organization, value: row.organization });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const columns = useMemo<ColumnDef<QueryDeviceRow>[]>(
    () => [
      {
        id: 'device',
        accessorKey: 'displayName',
        header: 'DEVICE',
        cell: ({ row }: { row: Row<QueryDeviceRow> }) => {
          const r = row.original;
          return (
            <div className="box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
              <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
                {r.deviceType &&
                  getDeviceTypeIcon(r.deviceType.toLowerCase() as DeviceType, {
                    className: 'w-5 h-5 text-ods-text-secondary',
                  })}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <TruncateText>{r.displayName || r.hostname}</TruncateText>
                {r.lastSeen && (
                  <span className="text-h6 text-ods-text-secondary truncate">
                    Last online: {formatRelativeTime(r.lastSeen)}
                  </span>
                )}
              </div>
            </div>
          );
        },
        meta: { width: 'flex-1 md:w-1/3' },
      },
      {
        id: 'organization',
        accessorKey: 'organization',
        header: 'CUSTOMER',
        cell: ({ row }: { row: Row<QueryDeviceRow> }) => {
          const r = row.original;
          const fullImageUrl = getFullImageUrl(r.organizationImageUrl, r.organizationImageHash);
          return (
            <div className="flex items-center gap-3">
              <EntityImage src={fullImageUrl} alt={r.organization || 'Customer'} className="size-12 md:size-12" />
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="text-h4 text-ods-text-primary break-words">{r.organization || ''}</span>
              </div>
            </div>
          );
        },
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-1/6', hideAt: 'lg' as const, filter: { options: customerOptions } },
      },
      {
        id: 'os',
        accessorKey: 'osType',
        header: 'OS',
        cell: ({ row }: { row: Row<QueryDeviceRow> }) => (
          <div className="flex items-start gap-2 shrink-0">
            <OSTypeBadge osType={row.original.osType} />
          </div>
        ),
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[120px] md:w-1/6', hideAt: 'md' as const, filter: { options: osOptions } },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<QueryDeviceRow> }) => {
          const config = getDeviceStatusConfig(row.original.status);
          return <Tag label={config.label} variant={config.variant} />;
        },
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[140px]', filter: { options: statusOptions } },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<QueryDeviceRow> }) =>
          row.original.machineId ? (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                onClick={openInNewTab(routes.devices.details(row.original.machineId))}
                variant="outline"
                size="icon"
                leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
                aria-label="Open in new tab"
                className="bg-ods-card"
              />
            </div>
          ) : null,
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
      },
    ],
    [statusOptions, osOptions, customerOptions],
  );

  const table = useDataTable<QueryDeviceRow>({
    data: filteredRows,
    columns,
    getRowId: (row: QueryDeviceRow) => String(row.id),
    enableSorting: false,
    clientSideFiltering: true,
  });

  const rowHref = useCallback(
    (row: QueryDeviceRow) => (row.machineId ? routes.devices.details(row.machineId) : undefined),
    [],
  );

  const tagsActive = selectedTags.length > 0;
  const hasActiveFilters = search.trim().length > 0 || tagsActive || table.getState().columnFilters.length > 0;
  const emptyMessage = hasActiveFilters ? 'No devices match the current filters' : 'No devices assigned to this query';

  return (
    <div className="flex flex-col gap-[var(--spacing-system-m)]">
      <div className="flex items-start gap-[var(--spacing-system-m)]">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search for Devices"
            value={search}
            onChange={e => setSearch(e.target.value)}
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
        </div>
        {isMdUp ? (
          <Button
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
            leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
            className="shrink-0"
          >
            Device Tags
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFilterModalOpen(true)}
            leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
            className="shrink-0"
          />
        )}
      </div>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body loading={isLoading} skeletonRows={5} emptyState={{ title: emptyMessage }} rowHref={rowHref} />
      </DataTable>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterGroups={[]}
        onFilterChange={() => {}}
        tagFilterKeys={tagFilterKeys}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        className="max-w-[600px]"
      />
    </div>
  );
}
