import React from 'react'
import { DeviceCard } from "@flamingo/ui-kit/components/ui"
import { type Device } from '../types/device.types'
import { getDeviceStatusConfig, getDeviceOperatingSystem } from '../utils/device-status'

interface DevicesGridProps {
  devices: Device[]
  isLoading: boolean
  filters: {
    statuses?: string[]
    deviceTypes?: string[]
    osTypes?: string[]
  }
  onDeviceMore: (device: Device) => void
  onDeviceDetails: (device: Device) => void
}

export function DevicesGrid({ 
  devices, 
  isLoading, 
  filters,
  onDeviceMore,
  onDeviceDetails 
}: DevicesGridProps) {
  return (
    <div className="space-y-4">
      {(filters.statuses?.length || filters.deviceTypes?.length || filters.osTypes?.length) ? (
        <div className="flex flex-wrap gap-2">
          {filters.statuses?.map(status => (
            <span key={status} className="px-3 py-1 bg-[#212121] border border-[#3a3a3a] rounded-[6px] text-[14px] text-[#fafafa]">
              Status: {status}
            </span>
          ))}
          {filters.deviceTypes?.map(type => (
            <span key={type} className="px-3 py-1 bg-[#212121] border border-[#3a3a3a] rounded-[6px] text-[14px] text-[#fafafa]">
              Type: {type}
            </span>
          ))}
          {filters.osTypes?.map(os => (
            <span key={os} className="px-3 py-1 bg-[#212121] border border-[#3a3a3a] rounded-[6px] text-[14px] text-[#fafafa]">
              OS: {os}
            </span>
          ))}
        </div>
      ) : null}
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#888888]">Loading devices...</div>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-[#212121] border border-[#3a3a3a] rounded-[6px]">
          <p className="text-[#888888]">No devices found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map(device => {
            const statusConfig = getDeviceStatusConfig(device.status)
            return (
              <DeviceCard
                key={device.agent_id}
                device={{
                  id: device.id,
                  name: device.displayName || device.hostname,
                  organization: device.organization || device.machineId,
                  status: statusConfig.cardStatus,
                  lastSeen: device.lastSeen,
                  operatingSystem: getDeviceOperatingSystem(device.osType),
                  tags: device.tags && device.tags.length > 0 
                    ? device.tags.map(tag => typeof tag === 'string' ? tag : tag.name)
                    : [
                        device.type || 'UNKNOWN',
                        device.osType || 'UNKNOWN',
                        ...(statusConfig.label !== 'ACTIVE' ? [statusConfig.label] : [])
                      ].filter(Boolean)
                }}
                actions={{
                  moreButton: {
                    visible: true,
                    onClick: () => onDeviceMore(device)
                  },
                  detailsButton: {
                    visible: true,
                    label: 'Details',
                    onClick: () => onDeviceDetails(device)
                  }
                }}
                className="h-full"
              />
            )
          })}
        </div>
      )}
    </div>
  )
}