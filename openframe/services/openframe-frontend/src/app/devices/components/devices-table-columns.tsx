import React from 'react'
import { StatusTag, type TableColumn, type RowAction } from "@flamingo/ui-kit/components/ui"
import { MoreHorizontal } from "lucide-react"
import { WindowsIcon, MacOSIcon, LinuxIcon } from "@flamingo/ui-kit/components/icons"
import { type Device } from '../types/device.types'
import { getDeviceStatusConfig } from '../utils/device-status'

function getOSIcon(osType?: string) {
  if (!osType) return null
  const os = osType.toLowerCase()
  if (os.includes('windows')) return <WindowsIcon className="w-4 h-4 text-ods-text-secondary" />
  if (os.includes('mac') || os.includes('darwin')) return <MacOSIcon className="w-4 h-4 text-ods-text-secondary" />
  if (os.includes('linux') || os.includes('ubuntu') || os.includes('pop')) return <LinuxIcon className="w-4 h-4 text-ods-text-secondary" />
  return null
}

export function getDeviceTableRowActions(
  onMore: (device: Device) => void,
  onDetails: (device: Device) => void
): RowAction<Device>[] {
  return [
    {
      label: 'Details',
      onClick: onDetails,
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ]
}

export function getDeviceTableColumns(deviceFilters?: any): TableColumn<Device>[] {
  return [
    {
      key: 'device',
      label: 'DEVICE',
      width: 'w-1/4',
      renderCell: (device) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">
            {device.displayName || device.hostname}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[18px] text-ods-text-secondary truncate">
            {device.organization || device.machineId}
          </span>
          <span className="font-['Azeret_Mono'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate uppercase">
            MAC: {device.macAddress || 'Unknown'}
          </span>
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
        label: status.value.charAt(0).toUpperCase() + status.value.slice(1).toLowerCase(),
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
              {new Date(device.last_seen).toLocaleDateString()} {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <div className="flex items-center gap-1">
            <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary">
              {device.osType}
            </span>
            {getOSIcon(device.osType)}
          </div>
        </div>
      )
    },
    {
      key: 'details',
      label: 'DETAILS',
      width: 'w-1/6',
      renderCell: (device) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-primary truncate">
            {device.model || device.manufacturer || 'Unknown Model'}
          </span>
          <span className="font-['DM_Sans'] font-normal text-[12px] leading-[16px] text-ods-text-secondary truncate">
            {device.serial_number || device.agent_id}
          </span>
        </div>
      )
    }
  ]
}