'use client'

import React, { useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button, StatusTag } from '@flamingo/ui-kit/components/ui'
import { WindowsIcon, MacOSIcon, LinuxIcon } from '@flamingo/ui-kit/components/icons'
import { useDeviceDetails } from '../../devices/hooks/use-device-details'

interface DeviceInfoSectionProps {
  deviceId?: string
  userId?: string
}

export function DeviceInfoSection({ deviceId, userId }: DeviceInfoSectionProps) {
  const { deviceDetails, isLoading, fetchDeviceByMachineId } = useDeviceDetails()

  useEffect(() => {
    if (deviceId) {
      fetchDeviceByMachineId(deviceId)
    }
  }, [deviceId, fetchDeviceByMachineId])

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
        <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-[#888888] w-full">
          Device Info
        </div>
        <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] w-full">
          <div className="flex gap-4 items-center h-20 px-4 py-0 border-b border-[#3a3a3a]">
            <div className="flex items-center justify-center w-full">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[#ffc008]" />
              <span className="ml-3 text-[#888888]">Loading device details...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-[#888888] w-full">
        Device Info
      </div>

      {/* Device Info Card */}
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] w-full">
        <div className="flex gap-4 items-center h-20 px-4 py-0 border-b border-[#3a3a3a]">
          {/* Status Column - Hidden but keeping spacing consistent */}
          <div className="flex gap-2 items-center h-20 overflow-hidden">
            {/* Empty space for status column alignment */}
          </div>

          {/* Device Name Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.displayName || deviceDetails?.hostname || deviceId || 'Unknown Device'}
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.ip || 'No IP address'}
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
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.lastSeen ? formatLastSeen(deviceDetails.lastSeen) : 'Never'}
              </div>
            </div>
          </div>

          {/* OS Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.osType || 'Unknown OS'}
                </div>
                {deviceDetails?.osType && getOSIcon(deviceDetails.osType)}
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.osVersion || 'Version unknown'}
              </div>
            </div>
          </div>

          {/* Hardware Column */}
          <div className="flex-1 flex gap-2 items-center h-20 min-w-0 overflow-hidden">
            <div className="flex flex-col flex-1 justify-center min-w-0">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap">
                  {deviceDetails?.manufacturer && deviceDetails?.model 
                    ? `${deviceDetails.manufacturer}, ${deviceDetails.model}`
                    : deviceDetails?.manufacturer || deviceDetails?.model || 'Unknown Hardware'
                  }
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] h-5 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {deviceDetails?.serialNumber || 'No serial number'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <Button
            onClick={handleMoreClick}
            variant="outline"
            size="icon"
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] p-[12px] rounded-[6px] shrink-0"
          >
            <MoreHorizontal className="h-6 w-6 text-[#fafafa]" />
          </Button>
        </div>
      </div>
    </div>
  )
}