'use client'

import React, { useEffect } from 'react'
import { DeviceCard, CardLoader, StatusTag } from '@flamingo/ui-kit/components/ui'
import { useDeviceDetails } from '../../devices/hooks/use-device-details'
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../../devices/utils/device-status'
import { DeviceDetailsButton } from '../../devices/components/device-details-button'

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

  // If no device details available, don't show anything
  if (!deviceDetails && !deviceId) {
    return null
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Device Info
      </div>

      {/* Use DeviceCard component - matching devices-grid.tsx pattern */}
      {deviceDetails && (
        <DeviceCard
          device={{
            id: deviceDetails.id,
            machineId: deviceDetails.machineId,
            name: deviceDetails.displayName || deviceDetails.hostname || deviceDetails.description || '',
            organization: deviceDetails.organization || deviceDetails.machineId,
            lastSeen: deviceDetails.lastSeen,
            operatingSystem: getDeviceOperatingSystem(deviceDetails.osType),
          }}
          statusBadgeComponent={
            deviceDetails.status && (() => {
              const statusConfig = getDeviceStatusConfig(deviceDetails.status)
              return (
                <StatusTag
                  label={statusConfig.label}
                  variant={statusConfig.variant}
                />
              )
            })()
          }
          actions={{
            moreButton: {
              visible: false
            },
            detailsButton: {
              visible: true,
              component: (
                <DeviceDetailsButton
                  deviceId={deviceDetails.id}
                  machineId={deviceDetails.machineId}
                  className="shrink-0"
                />
              )
            }
          }}
        />
      )}
    </div>
  )
}