'use client';

import type { SoftwareSource } from '@flamingo-stack/openframe-frontend-core';
import { SoftwareInfo, SoftwareSourceBadge, Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  type ColumnDef,
  DataTable,
  type Row,
  type SortingState,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useCallback, useMemo, useState } from 'react';
import type { Device, Software } from '../../types/device.types';

interface SoftwareTabProps {
  device: Device | null;
}

export function SoftwareTab({ device }: SoftwareTabProps) {
  const software = device?.software || [];
  const [sorting, setSorting] = useState<SortingState>([]);

  // Format date for display - matches device-info-section.tsx format
  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }, []);

  // Define table columns
  const columns = useMemo<ColumnDef<Software>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'SOFTWARE',
        cell: ({ row }: { row: Row<Software> }) => (
          <SoftwareInfo name={row.original.name} vendor={row.original.vendor} version={row.original.version} />
        ),
        enableSorting: true,
        meta: { width: 'w-[40%]' },
      },
      {
        accessorKey: 'source',
        header: 'SOURCE',
        cell: ({ row }: { row: Row<Software> }) => (
          <SoftwareSourceBadge source={row.original.source as SoftwareSource} />
        ),
        enableSorting: true,
        meta: { width: 'w-[20%]' },
      },
      {
        id: 'vulnerabilities',
        header: 'SECURITY',
        accessorFn: (row: Software) => row.vulnerabilities.length,
        cell: ({ row }: { row: Row<Software> }) => {
          const vulnCount = row.original.vulnerabilities.length;
          if (vulnCount === 0) {
            return <Tag label="NO ISSUES" variant="success" className="px-2 py-1 text-[12px] leading-[16px]" />;
          }
          return <Tag label={`${vulnCount} ${vulnCount === 1 ? 'ISSUE' : 'ISSUES'}`} variant="error" />;
        },
        enableSorting: true,
        sortingFn: (rowA: Row<Software>, rowB: Row<Software>) => {
          const a = rowA.original.vulnerabilities.length;
          const b = rowB.original.vulnerabilities.length;
          if (a === b) return 0;
          return a > b ? 1 : -1;
        },
        meta: { width: 'w-[15%]' },
      },
      {
        accessorKey: 'last_opened_at',
        header: 'LAST OPENED',
        cell: ({ row }: { row: Row<Software> }) => (
          <div className="font-['DM_Sans'] font-medium text-ods-text-primary">
            {formatDate(row.original.last_opened_at)}
          </div>
        ),
        enableSorting: true,
        meta: { width: 'w-[25%]' },
      },
    ],
    [formatDate],
  );

  const table = useDataTable<Software>({
    data: software,
    columns,
    getRowId: (row: Software) => String(row.id),
    clientSideSorting: true,
    state: { sorting, columnFilters: [] },
    onSortingChange: setSorting,
  });

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    );
  }

  if (software.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No software data available for this device</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-h5 text-ods-text-secondary">Installed Software ({software.length})</h3>
      </div>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body rowClassName="mb-1" />
      </DataTable>
    </div>
  );
}
