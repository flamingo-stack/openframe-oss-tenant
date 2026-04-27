import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import { type ColumnDef, type Row, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type React from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { deduplicateFilterOptions } from '@/lib/filter-utils';
import { getFullImageUrl } from '@/lib/image-url';
import { DEFAULT_VISIBLE_STATUSES, DEVICE_STATUS } from '../constants/device-statuses';
import type { Device, DeviceFilters } from '../types/device.types';
import { getDeviceStatusConfig } from '../utils/device-status';
import { DeviceActionsDropdown } from './device-actions-dropdown';

// Returns render function for custom actions area (three dots menu only)
export function getDeviceTableRowActions(onRefresh?: () => void): (device: Device) => React.ReactNode {
  const DeviceRowActions = (device: Device) => (
    <DeviceActionsDropdown device={device} context="table" onActionComplete={onRefresh} />
  );
  DeviceRowActions.displayName = 'DeviceRowActions';
  return DeviceRowActions;
}

function OrganizationCell({ device }: { device: Device }) {
  const fullImageUrl = getFullImageUrl(device.organizationImageUrl);

  return (
    <div className="flex items-center gap-3">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationIcon imageUrl={fullImageUrl} organizationName={device.organization || 'Organization'} size="sm" />
      )}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary break-words">
          {device.organization || ''}
        </span>
      </div>
    </div>
  );
}

export interface DeviceFilterColumn {
  key: string;
  label: string;
  filterable?: boolean;
  filterOptions?: Array<{ id: string; label: string; value: string }>;
}

// Filter column metadata used by the external filter modal (useTagFilterModal).
// Kept separate from the table ColumnDef because DataTable doesn't carry the
// filter metadata that the external mobile filter modal needs.
export function getDeviceFilterColumns(deviceFilters?: DeviceFilters | null): DeviceFilterColumn[] {
  return [
    {
      key: 'device',
      label: 'DEVICE',
    },
    {
      key: 'status',
      label: 'STATUS',
      filterable: true,
      filterOptions: (() => {
        const statuses = deviceFilters?.statuses || [];
        // Show only DEFAULT_VISIBLE_STATUSES (excludes ARCHIVED and DELETED)
        const normalStatuses = statuses.filter(s => (DEFAULT_VISIBLE_STATUSES as readonly string[]).includes(s.value));

        return normalStatuses
          .map(status => ({
            id: status.value,
            label: getDeviceStatusConfig(status.value).label,
            value: status.value,
          }))
          .sort((a, b) => {
            if (a.value === DEVICE_STATUS.ARCHIVED) return 1;
            if (b.value === DEVICE_STATUS.ARCHIVED) return -1;
            return 0;
          });
      })(),
    },
    {
      key: 'os',
      label: 'OS',
      filterable: true,
      filterOptions:
        deviceFilters?.osTypes?.map(os => ({
          id: os.value,
          label: os.value,
          value: os.value,
        })) || [],
    },
    {
      key: 'organization',
      label: 'ORGANIZATION',
      filterable: true,
      filterOptions: deduplicateFilterOptions(
        deviceFilters?.organizationIds?.map(org => ({
          id: org.value,
          label: org.label,
          value: org.value,
        })) || [],
      ),
    },
  ];
}

export function getDeviceTableColumns(deviceFilters?: DeviceFilters | null): ColumnDef<Device>[] {
  const statusFilterOptions = (() => {
    const statuses = deviceFilters?.statuses || [];
    return statuses
      .filter(s => (DEFAULT_VISIBLE_STATUSES as readonly string[]).includes(s.value))
      .map(s => ({ id: s.value, label: getDeviceStatusConfig(s.value).label, value: s.value }))
      .sort((a, b) => {
        if (a.value === DEVICE_STATUS.ARCHIVED) return 1;
        if (b.value === DEVICE_STATUS.ARCHIVED) return -1;
        return 0;
      });
  })();

  const osFilterOptions = deviceFilters?.osTypes?.map(os => ({ id: os.value, label: os.value, value: os.value })) ?? [];

  const orgFilterOptions = deduplicateFilterOptions(
    deviceFilters?.organizationIds?.map(org => ({ id: org.value, label: org.label, value: org.value })) ?? [],
  );

  return [
    {
      accessorKey: 'device',
      id: 'device',
      header: 'DEVICE',
      cell: ({ row }: { row: Row<Device> }) => {
        const device = row.original;
        return (
          <div className="box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
            <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
              {device.type &&
                getDeviceTypeIcon(device.type.toLowerCase() as DeviceType, {
                  className: 'w-5 h-5 text-ods-text-secondary',
                })}
            </div>
            <div className="text-h4 text-ods-text-primary truncate">
              <p className="leading-[24px] overflow-ellipsis overflow-hidden whitespace-pre">
                {device.displayName || device.hostname}
              </p>
            </div>
          </div>
        );
      },
      meta: { width: 'flex-1 md:w-1/4' },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'STATUS',
      cell: ({ row }: { row: Row<Device> }) => {
        const device = row.original;
        const statusConfig = getDeviceStatusConfig(device.status);
        return (
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="inline-flex">
              <Tag label={statusConfig.label} variant={statusConfig.variant} />
            </div>
            <span className="text-h6 text-ods-text-secondary hidden md:flex">
              {device.last_seen
                ? `${new Date(device.last_seen).toLocaleDateString()} ${new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Never'}
            </span>
          </div>
        );
      },
      meta: {
        width: 'w-[80px] md:w-1/5',
        filter: statusFilterOptions.length > 0 ? { options: statusFilterOptions } : undefined,
      },
    },
    {
      accessorKey: 'os',
      id: 'os',
      header: 'OS',
      cell: ({ row }: { row: Row<Device> }) => (
        <OSTypeBadge osType={row.original.osType} iconSize="w-4 h-4 md:w-6 md:h-6" />
      ),
      meta: {
        width: 'w-[200px] md:w-1/6',
        hideAt: 'md',
        filter: osFilterOptions.length > 0 ? { options: osFilterOptions } : undefined,
      },
    },
    {
      accessorKey: 'organization',
      id: 'organization',
      header: 'ORGANIZATION',
      cell: ({ row }: { row: Row<Device> }) => <OrganizationCell device={row.original} />,
      meta: {
        width: 'w-1/6',
        hideAt: 'lg',
        filter: orgFilterOptions.length > 0 ? { options: orgFilterOptions, placement: 'bottom-end' } : undefined,
      },
    },
  ];
}
