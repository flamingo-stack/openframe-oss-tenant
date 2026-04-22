'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Table, type TableColumn, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
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

  const columns: TableColumn<PolicyDeviceRow>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        width: 'flex-1 md:w-1/3',
        renderCell: (row: PolicyDeviceRow) => (
          <div className="box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
            <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
              {row.deviceType &&
                getDeviceTypeIcon(row.deviceType.toLowerCase() as DeviceType, {
                  className: 'w-5 h-5 text-ods-text-secondary',
                })}
            </div>
            <div className="text-h4 text-ods-text-primary truncate">
              <p className="leading-[24px] overflow-ellipsis overflow-hidden whitespace-pre">
                {row.displayName || row.hostname}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'organization',
        label: 'ORGANIZATION',
        width: 'w-1/6',
        hideAt: 'lg',
        renderCell: (row: PolicyDeviceRow) => {
          const fullImageUrl = getFullImageUrl(row.organizationImageUrl);
          return (
            <div className="flex items-center gap-3">
              {featureFlags.organizationImages.displayEnabled() && (
                <OrganizationIcon
                  imageUrl={fullImageUrl}
                  organizationName={row.organization || 'Organization'}
                  size="sm"
                />
              )}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary break-words">
                  {row.organization || ''}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'os',
        label: 'OS',
        width: 'w-[120px] md:w-1/6',
        hideAt: 'md',
        renderCell: (row: PolicyDeviceRow) => (
          <div className="flex items-start gap-2 shrink-0">
            <OSTypeBadge osType={row.osType} />
          </div>
        ),
      },
      {
        key: 'compliance',
        label: 'STATUS',
        width: 'w-[140px]',
        renderCell: (row: PolicyDeviceRow) => {
          if (row.complianceStatus === 'pending') return <Tag label="Pending" variant="warning" />;
          return (
            <Tag
              label={row.complianceStatus === 'non-compliant' ? 'Non-Compliant' : 'Passing'}
              variant={row.complianceStatus === 'non-compliant' ? 'error' : 'success'}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <Table
      data={rows}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      skeletonRows={5}
      emptyMessage="No devices found for this policy"
      showFilters={false}
      rowHref={row => (row.machineId ? `/devices/details/${row.machineId}` : undefined)}
    />
  );
}
