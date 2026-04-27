'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  type ColumnDef,
  DataTable,
  type Row,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
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
              <div className="text-h4 text-ods-text-primary truncate">
                <p className="leading-[24px] overflow-ellipsis overflow-hidden whitespace-pre">
                  {r.displayName || r.hostname}
                </p>
              </div>
            </div>
          );
        },
        meta: { width: 'flex-1 md:w-1/3' },
      },
      {
        id: 'organization',
        accessorKey: 'organization',
        header: 'ORGANIZATION',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => {
          const r = row.original;
          const fullImageUrl = getFullImageUrl(r.organizationImageUrl);
          return (
            <div className="flex items-center gap-3">
              {featureFlags.organizationImages.displayEnabled() && (
                <OrganizationIcon
                  imageUrl={fullImageUrl}
                  organizationName={r.organization || 'Organization'}
                  size="sm"
                />
              )}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary break-words">
                  {r.organization || ''}
                </span>
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
    (row: PolicyDeviceRow) => (row.machineId ? `/devices/details/${row.machineId}` : undefined),
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
