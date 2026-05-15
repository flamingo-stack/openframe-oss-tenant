'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  type Row,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { usePolicyDevicesTable } from '../hooks/use-policy-devices-table';
import type { PolicyDeviceRow } from '../types/policy-device-row';

const COMPLIANCE_STATUS_LABEL: Record<string, string> = {
  'non-compliant': 'Non-Compliant',
  passing: 'Passing',
  pending: 'Pending',
};

interface PolicyDevicesTableProps {
  policyId: number;
  assignedHostIds?: Array<{ id: number; hostname: string }>;
}

export function PolicyDevicesTable({ policyId, assignedHostIds }: PolicyDevicesTableProps) {
  const { rows, isLoading } = usePolicyDevicesTable(policyId, assignedHostIds);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Filter option universes — distinct values from the current rows set.
  const deviceTypeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const r of rows) {
      if (r.deviceType && !seen.has(r.deviceType)) {
        seen.set(r.deviceType, { id: r.deviceType, label: r.deviceType, value: r.deviceType });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const organizationOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const r of rows) {
      if (r.organization && !seen.has(r.organization)) {
        seen.set(r.organization, { id: r.organization, label: r.organization, value: r.organization });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const osOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const r of rows) {
      if (r.osType && !seen.has(r.osType)) {
        seen.set(r.osType, { id: r.osType, label: r.osType, value: r.osType });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const complianceOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; value: string }>();
    for (const r of rows) {
      if (r.complianceStatus && !seen.has(r.complianceStatus)) {
        seen.set(r.complianceStatus, {
          id: r.complianceStatus,
          label: COMPLIANCE_STATUS_LABEL[r.complianceStatus] ?? r.complianceStatus,
          value: r.complianceStatus,
        });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  // Client-side filter application: each active filter narrows the rows.
  const filteredRows = useMemo(() => {
    let result = rows;
    for (const f of columnFilters) {
      const values = (f.value as string[] | undefined) ?? [];
      if (values.length === 0) continue;
      const set = new Set(values);
      if (f.id === 'device') {
        result = result.filter(r => r.deviceType && set.has(r.deviceType));
      } else if (f.id === 'organization') {
        result = result.filter(r => r.organization && set.has(r.organization));
      } else if (f.id === 'os') {
        result = result.filter(r => r.osType && set.has(r.osType));
      } else if (f.id === 'compliance') {
        result = result.filter(r => r.complianceStatus && set.has(r.complianceStatus));
      }
    }
    return result;
  }, [rows, columnFilters]);

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
        meta: {
          width: 'flex-1 md:w-1/3',
          filter: deviceTypeOptions.length > 0 ? { options: deviceTypeOptions } : undefined,
        },
      },
      {
        id: 'organization',
        accessorKey: 'organization',
        header: 'CUSTOMER',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) => {
          const r = row.original;
          const fullImageUrl = getFullImageUrl(r.organizationImageUrl);
          return (
            <div className="flex items-center gap-3">
              {featureFlags.organizationImages.displayEnabled() && (
                <OrganizationIcon imageUrl={fullImageUrl} organizationName={r.organization || 'Customer'} size="sm" />
              )}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary break-words">
                  {r.organization || ''}
                </span>
              </div>
            </div>
          );
        },
        meta: {
          width: 'w-1/6',
          hideAt: 'lg' as const,
          filter:
            organizationOptions.length > 0
              ? { options: organizationOptions, placement: 'bottom-end' as const }
              : undefined,
        },
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
        meta: {
          width: 'w-[120px] md:w-1/6',
          hideAt: 'md' as const,
          filter: osOptions.length > 0 ? { options: osOptions } : undefined,
        },
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
        meta: {
          width: 'w-[140px]',
          filter: complianceOptions.length > 0 ? { options: complianceOptions } : undefined,
        },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<PolicyDeviceRow> }) =>
          row.original.machineId ? (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                href={`/devices/details/${row.original.machineId}`}
                prefetch={false}
                openInNewTab
                variant="outline"
                size="icon"
                leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
                aria-label="Open in new tab"
                className="bg-ods-card"
              />
            </div>
          ) : null,
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [deviceTypeOptions, organizationOptions, osOptions, complianceOptions],
  );

  const table = useDataTable<PolicyDeviceRow>({
    data: filteredRows,
    columns,
    getRowId: (row: PolicyDeviceRow) => String(row.id),
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
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
