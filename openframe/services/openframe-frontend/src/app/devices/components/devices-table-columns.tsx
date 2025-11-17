import React from 'react'
import { StatusTag, type TableColumn } from "@flamingo/ui-kit/components/ui"
import { OSTypeBadge } from "@flamingo/ui-kit/components/features"
import { type Device } from '../types/device.types'
import { getDeviceStatusConfig } from '../utils/device-status'
import { DeviceType, getDeviceTypeIcon } from '@flamingo/ui-kit'
import { DeviceDetailsButton } from './device-details-button'

// Returns render function for custom actions area
export function getDeviceTableRowActions(): ((device: Device) => React.ReactNode) {
  const DeviceRowActions = (device: Device) => (
    <DeviceDetailsButton
      deviceId={device.id}
      machineId={device.machineId}
      className="h-12"
    />
  )
  DeviceRowActions.displayName = 'DeviceRowActions'
  return DeviceRowActions
}

export function getDeviceTableColumns(deviceFilters?: any): TableColumn<Device>[] {
  return [
    {
      key: 'device',
      label: 'DEVICE',
      width: 'w-1/3',
      renderCell: (device) => (
        <div className="bg-ods-card box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
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
      width: 'w-1/6',
      filterable: true,
      filterOptions: deviceFilters?.statuses?.map((status: any) => ({
        id: status.value,
        label: getDeviceStatusConfig(status.value).label,
        value: status.value
      })) || [],
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
      width: 'w-1/6',
      filterable: true,
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
      filterable: true,
      filterOptions: deviceFilters?.organizationIds?.map((org: any) => ({
        id: org.value,
        label: org.label,
        value: org.value
      })) || [],
      renderCell: (device) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">
            {device.organization ||''}
          </span>
        </div>
      )
    }
  ]
}