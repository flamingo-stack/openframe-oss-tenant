'use client';

import { CardLoader, DeviceCard, StatusTag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useEffect } from 'react';
import { DeviceDetailsButton } from '../../devices/components/device-details-button';
import { useDeviceDetails } from '../../devices/hooks/use-device-details';
import type { Device } from '../../devices/types/device.types';
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../../devices/utils/device-status';

interface DeviceInfoSectionProps {
  deviceId?: string;
  userId?: string;
  device?: Partial<Device>; // Accept device data from log or dialog
}

export function DeviceInfoSection({ deviceId, userId, device: deviceFromProps }: DeviceInfoSectionProps) {
  const { deviceDetails, isLoading, fetchDeviceById } = useDeviceDetails();

  useEffect(() => {
    // Only fetch if we don't already have device data and we have a deviceId
    if (deviceId && !deviceFromProps) {
      fetchDeviceById(deviceId);
    }
  }, [deviceId, deviceFromProps, fetchDeviceById]);

  // Use device from props if available, otherwise use fetched deviceDetails
  const device = deviceFromProps || deviceDetails;

  // Show loading state only if we're fetching and don't have data from props
  if (isLoading && !deviceFromProps) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
          Device Info
        </div>
        <CardLoader items={2} containerClassName="p-0" />
      </div>
    );
  }

  // If no device details available, don't show anything
  if (!device && !deviceId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Device Info
      </div>

      {/* Use DeviceCard component - matching devices-grid.tsx pattern */}
      {device && (
        <DeviceCard
          device={{
            id: device.id || deviceId || '',
            machineId: device.machineId || deviceId || '',
            name: device.displayName || device.hostname || device.description || device.machineId || deviceId || '',
            organization: device.organization || device.machineId || deviceId || '',
            lastSeen: device.lastSeen || device.last_seen,
            operatingSystem: getDeviceOperatingSystem(device.osType),
          }}
          statusBadgeComponent={
            device.status &&
            (() => {
              const statusConfig = getDeviceStatusConfig(device.status);
              return <StatusTag label={statusConfig.label} variant={statusConfig.variant} />;
            })()
          }
          actions={{
            moreButton: {
              visible: false,
            },
            detailsButton: {
              visible: true,
              component: (
                <DeviceDetailsButton
                  deviceId={device.id || deviceId || ''}
                  machineId={device.machineId || deviceId || ''}
                  className="shrink-0"
                />
              ),
            },
          }}
        />
      )}
    </div>
  );
}
