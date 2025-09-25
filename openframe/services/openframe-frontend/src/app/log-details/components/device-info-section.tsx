'use client'

import React, { useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button, StatusTag } from '@flamingo/ui-kit/components/ui'
import { WindowsIcon, MacOSIcon, LinuxIcon, DevicesIcon } from '@flamingo/ui-kit/components/icons'
import { useDeviceDetails } from '../../devices/hooks/use-device-details'
import { CardLoader } from '@flamingo/ui-kit/components/ui'

interface DeviceInfoSectionProps {
  deviceId?: string
  userId?: string
}

export function DeviceInfoSection({ deviceId, userId }: DeviceInfoSectionProps) {
  const { deviceDetails, isLoading, fetchDeviceById } = useDeviceDetails()

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  const handleMoreClick = () => {
    console.log('More options clicked')
  }

  // Helper function to get OS icon
  const getOSIcon = (osType: string) => {
    const os = osType.toLowerCase()
    if (os.includes('windows')) return <WindowsIcon />
    if (os.includes('mac') || os.includes('darwin')) return <MacOSIcon />
    if (os.includes('linux')) return <LinuxIcon />
    return <WindowsIcon /> // Default fallback
  }

  // Helper function to get status variant
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status.toUpperCase()) {
      case 'ONLINE':
      case 'ACTIVE':
        return 'success'
      case 'OFFLINE':
        return 'error'
      case 'IDLE':
        return 'warning'
      default:
        return 'info'
    }
  }

  // Format last seen date
  const formatLastSeen = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
          Device Info
        </div>
        <CardLoader items={2} containerClassName="p-0" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Device Info
      </div>

      {/* Device Info - Mobile: Stacked Cards, Desktop: Horizontal Row */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full">
        {/* Mobile Layout: Stacked */}
        <div className="md:hidden">
          {/* Device Name Row */}
          <div className="flex gap-3 items-center p-4 border-b border-ods-border">
            <div className="bg-ods-card border border-ods-border rounded-[6px] p-2 flex items-center justify-center shrink-0">
              <DevicesIcon size={16} className="text-ods-text-secondary" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="font-['DM_Sans'] font-medium text-[16px] leading-[22px] text-ods-text-primary truncate">
                {deviceDetails?.displayName || deviceDetails?.hostname || deviceId || 'Unknown Device'}
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                Desktop • {deviceDetails?.ip || 'No IP address'}
              </div>
            </div>
            <Button
              onClick={handleMoreClick}
              variant="outline"
              size="icon"
              centerIcon={<MoreHorizontal className="h-5 w-5 text-ods-text-primary" />}
              className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover p-2 rounded-[6px] shrink-0"
            />
          </div>

          {/* Status and Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-4">
            {/* Status */}
            <div className="flex flex-col gap-2">
              <StatusTag
                label={deviceDetails?.status || 'UNKNOWN'}
                variant={deviceDetails ? getStatusVariant(deviceDetails.status) : 'info'}
              />
              <div className="font-['DM_Sans'] font-medium text-[12px] leading-[18px] text-ods-text-secondary">
                {deviceDetails?.lastSeen ? formatLastSeen(deviceDetails.lastSeen) : 'Never'}
              </div>
            </div>

            {/* OS */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="font-['DM_Sans'] font-medium text-[16px] leading-[22px] text-ods-text-primary truncate">
                  {deviceDetails?.osType || 'Unknown OS'}
                </div>
                {deviceDetails?.osType && getOSIcon(deviceDetails.osType)}
              </div>
              <div className="font-['DM_Sans'] font-medium text-[12px] leading-[18px] text-ods-text-secondary truncate">
                {deviceDetails?.osVersion || 'Version unknown'}
              </div>
            </div>

            {/* Hardware - Full Width */}
            <div className="col-span-2 flex flex-col gap-1">
              <div className="font-['DM_Sans'] font-medium text-[16px] leading-[22px] text-ods-text-primary truncate">
                {deviceDetails?.manufacturer && deviceDetails?.model
                  ? `${deviceDetails.manufacturer}, ${deviceDetails.model}`
                  : deviceDetails?.manufacturer || deviceDetails?.model || 'Unknown Hardware'
                }
              </div>
              <div className="font-['DM_Sans'] font-medium text-[12px] leading-[18px] text-ods-text-secondary">
                Serial: {deviceDetails?.serialNumber || 'Not available'}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout: Horizontal Row */}
        <div className="hidden md:flex gap-4 items-center h-20 px-4 py-0 border-b border-ods-border">
          {/* Device Icon Column */}
          <div className="flex gap-2 items-center h-20 shrink-0">
            <div className="flex flex-col justify-center">
              <div className="flex gap-1 items-center w-full">
                <div className="bg-ods-card border border-ods-border rounded-[6px] p-2 flex items-center justify-center">
                  <DevicesIcon size={16} className="text-ods-text-secondary" />
                </div>
              </div>
            </div>
          </div>

          {/* Device Name Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.displayName || deviceDetails?.hostname || deviceId || 'Unknown Device'}
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                Desktop • {deviceDetails?.ip || 'No IP address'}
              </div>
            </div>
          </div>

          {/* Status Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <StatusTag
                  label={deviceDetails?.status || 'UNKNOWN'}
                  variant={deviceDetails ? getStatusVariant(deviceDetails.status) : 'info'}
                />
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.lastSeen ? formatLastSeen(deviceDetails.lastSeen) : 'Never'}
              </div>
            </div>
          </div>

          {/* OS Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.osType || 'Unknown OS'}
                </div>
                {deviceDetails?.osType && getOSIcon(deviceDetails.osType)}
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.osVersion || 'Version unknown'}
              </div>
            </div>
          </div>

          {/* Hardware Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.manufacturer && deviceDetails?.model
                    ? `${deviceDetails.manufacturer}, ${deviceDetails.model}`
                    : deviceDetails?.manufacturer || deviceDetails?.model || 'Unknown Hardware'
                  }
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.serialNumber || 'No serial number'}
              </div>
            </div>
          </div>

          {/* Actions - Just the three dots */}
          <Button
            onClick={handleMoreClick}
            variant="outline"
            size="icon"
            centerIcon={<MoreHorizontal className="h-6 w-6 text-ods-text-primary" />}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover p-[12px] rounded-[6px] shrink-0"
          />
        </div>
      </div>
    </div>
  )
}