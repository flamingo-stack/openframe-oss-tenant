'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  EntityImage,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
import { usePolicyDevicesTable } from '../hooks/use-policy-devices-table';
import type { PolicyDeviceRow } from '../types/policy-device-row';

interface PolicyDevicesTableProps {
  policyId: number;
  assignedHostIds?: Array<{ id: number; hostname: string }>;
}

export function PolicyDevicesTable({ policyId, assignedHostIds }: PolicyDevicesTableProps) {
  const { rows, isLoading } = usePolicyDevicesTable(policyId, assignedHostIds);

  const columns = useMemo<ColumnDef<PolicyDeviceRow>[]>(
    () => [
      {
        id: 'device',
        accessorKey: 'displayName',
        header: 'DEVICE',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => {
          const r = row.original;
          return (
            <div className="box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
              <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
                {r.deviceType &&
                  getDeviceTypeIcon(r.deviceType.toLowerCase() as DeviceType, {
                    className: 'w-5 h-5 text-ods-text-secondary',
                  })}
              </div>
              <div className="flex-1 min-w-0">
                <TruncateText>{r.displayName || r.hostname}</TruncateText>
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
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => {
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
        meta: { width: 'w-1/6', hideAt: 'lg' as const },
      },
      {
        id: 'os',
        accessorKey: 'osType',
        header: 'OS',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => (
          <div className="flex items-start gap-2 shrink-0">
            <OSTypeBadge osType={row.original.osType} />
          </div>
        ),
        meta: { width: 'w-[120px] md:w-1/6', hideAt: 'md' as const },
      },
      {
        id: 'compliance',
        accessorKey: 'complianceStatus',
        header: 'STATUS',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => {
          const r = row.original;
          if (r.complianceStatus === 'pending') return <Tag label="Pending" variant="warning" />;
          return (
            <Tag
              label={r.complianceStatus === 'non-compliant' ? 'Non-Compliant' : 'Passing'}
              variant={r.complianceStatus === 'non-compliant' ? 'error' : 'success'}
            />
          );
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) =>
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
    [],
  );

  const table = useDataTable<PolicyDeviceRow>({
    data: rows,
    columns,
    getRowId: (row: PolicyDeviceRow) => String(row.id),
    enableSorting: false,
  });

  const policyDeviceRowHref = useCallback(
    (row: PolicyDeviceRow) => (row.machineId ? routes.devices.details(row.machineId) : undefined),
    [],
  );

  return (
    <DataTable table={table}>
      <DataTable.Header rightSlot={<DataTable.RowCount />} />
      <DataTable.Body
        loading={isLoading}
        skeletonRows={5}
        emptyMessage="No devices found for this policy"
        rowHref={policyDeviceRowHref}
      />
    </DataTable>
  );
}
