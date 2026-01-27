import { DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core'
import { OSTypeBadge, OrganizationIcon } from "@flamingo-stack/openframe-frontend-core/components/features"
import { StatusTag, type TableColumn } from "@flamingo-stack/openframe-frontend-core/components/ui"
import { featureFlags } from '@lib/feature-flags'
import { deduplicateFilterOptions } from '@lib/filter-utils'
import React from 'react'
import { DEFAULT_VISIBLE_STATUSES } from '../constants/device-statuses'
import { type Device } from '../types/device.types'
import { getDeviceStatusConfig } from '../utils/device-status'
import { DeviceActionsDropdown } from './device-actions-dropdown'

// Returns render function for custom actions area (three dots menu only)
export function getDeviceTableRowActions(onRefresh?: () => void): ((device: Device) => React.ReactNode) {
  const DeviceRowActions = (device: Device) => (
    <DeviceActionsDropdown
      device={device}
      context="table"
      onActionComplete={onRefresh}
    />
  )
  DeviceRowActions.displayName = 'DeviceRowActions' 
  return DeviceRowActions
}

function OrganizationCell({ device, fetchedImageUrls }: {
  device: Device;
  fetchedImageUrls: Record<string, string | undefined>;
}) {
  const fetchedImageUrl = device.organizationImageUrl ? fetchedImageUrls[device.organizationImageUrl] : undefined

  return (
    <div className="flex items-center gap-3">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationIcon
          imageUrl={fetchedImageUrl}
          organizationName={device.organization || 'Organization'}
          size="sm"
          preFetched={true}
        />
      )}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary break-words">
          {device.organization || ''}
        </span>
      </div>
    </div>
  )
}

export function getDeviceTableColumns(deviceFilters?: any, fetchedImageUrls: Record<string, string | undefined> = {}): TableColumn<Device>[] {
  return [
    {
      key: 'device',
      label: 'DEVICE',
      width: 'flex-1 md:w-1/3',
      renderCell: (device) => (
        <div className="box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
          <div className="flex h-8 w-8 items-center justify-center relative rounded-[6px] shrink-0 border border-ods-border">
            {device.type && getDeviceTypeIcon(device.type.toLowerCase() as DeviceType, { className: 'w-5 h-5 text-ods-text-secondary' })}
          </div>
          <div className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate">
            <p className="leading-[24px] overflow-ellipsis overflow-hidden whitespace-pre">
              {device.displayName || device.hostname}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-[100px] md:w-1/6',
      filterable: true,
      filterOptions: (() => {
        const statuses = deviceFilters?.statuses || []
        // Show only DEFAULT_VISIBLE_STATUSES (excludes ARCHIVED and DELETED)
        const normalStatuses = statuses.filter((s: any) =>
          (DEFAULT_VISIBLE_STATUSES as readonly string[]).includes(s.value)
        )
        // ARCHIVED shown separately below a divider, DELETED is completely hidden
        const archivedStatus = statuses.find((s: any) => s.value === 'ARCHIVED')

        const options: any[] = normalStatuses.map((status: any) => ({
          id: status.value,
          label: getDeviceStatusConfig(status.value).label,
          value: status.value
        }))

        // Add separator and archived if exists in data
        if (archivedStatus) {
          options.push({
            id: 'separator-archived',
            label: '',
            value: '',
            type: 'separator'
          })
          options.push({
            id: archivedStatus.value,
            label: getDeviceStatusConfig(archivedStatus.value).label,
            value: archivedStatus.value
          })
        }

        return options
      })(),
      renderCell: (device) => {
        const statusConfig = getDeviceStatusConfig(device.status)
        return (
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="inline-flex">
              <StatusTag 
                label={statusConfig.label} 
                variant={statusConfig.variant}
                className="px-2 py-1 text-[12px] leading-[16px]"
              />
            </div>
            <span className="font-['DM_Sans'] font-normal text-[12px] leading-[16px] text-ods-text-secondary">
              {device.last_seen ? `${new Date(device.last_seen).toLocaleDateString()} ${new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'os',
      label: 'OS',
      width: 'w-[120px] md:w-1/6',
      filterable: true,
      hideAt: 'sm',
      filterOptions: deviceFilters?.osTypes?.map((os: any) => ({
        id: os.value,
        label: os.value,
        value: os.value
      })) || [],
      renderCell: (device) => (
        <div className="flex items-start gap-2 shrink-0">
          <OSTypeBadge
            osType={device.osType}
          />
        </div>
      )
    },
    {
      key: 'organization',
      label: 'ORGANIZATION',
      width: 'w-1/6',
      hideAt: 'lg',
      filterable: true,
      filterOptions: deduplicateFilterOptions(
        deviceFilters?.organizationIds?.map((org: any) => ({
          id: org.value,
          label: org.label,
          value: org.value
        })) || []
      ),
      renderCell: (device) => <OrganizationCell device={device} fetchedImageUrls={fetchedImageUrls} />
    }
  ]
}