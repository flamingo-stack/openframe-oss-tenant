'use client';

import { OSTypeLabel } from '@flamingo-stack/openframe-frontend-core/components/features';
import React from 'react';
import { Device } from '../types/device.types';

interface DeviceInfoSectionProps {
  device: Device | null;
}

export function DeviceInfoSection({ device }: DeviceInfoSectionProps) {
  if (!device) {
    return (
      <div className="bg-ods-card border border-ods-border rounded-lg p-6">
        <div className="text-center text-ods-text-secondary">No device data available</div>
      </div>
    );
  }

  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div>
          <p className="text-ods-text-primary font-medium">{device.type || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-sm mb-1">Type</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">{device.manufacturer || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-xs mt-1">Manufacturer</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">{device.model || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-xs mt-1">Model</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">
            {device.serialNumber || device.serial_number || 'Unknown'}
          </p>
          <p className="text-ods-text-secondary text-xs mt-1">Serial Number</p>
        </div>
      </div>

      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div>
          <p className="text-ods-text-primary font-medium">{device.hostname || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-sm mb-1">Host Name</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">{device.organization || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-xs mt-1">Organization Name</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">
            {device.updatedAt
              ? `${new Date(device.updatedAt).toLocaleDateString()} ${new Date(device.updatedAt).toLocaleTimeString()}`
              : device.lastSeen
                ? `${new Date(device.lastSeen).toLocaleDateString()} ${new Date(device.lastSeen).toLocaleTimeString()}`
                : 'Unknown'}
          </p>
          <p className="text-ods-text-secondary text-xs mt-1">Last Seen</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">
            {device.boot_time
              ? `${new Date(device.boot_time * 1000).toLocaleDateString()} ${new Date(device.boot_time * 1000).toLocaleTimeString()}`
              : 'Unknown'}
          </p>
          <p className="text-ods-text-secondary text-xs mt-1">Last Boot</p>
        </div>
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <p className="text-ods-text-primary font-medium">
            <OSTypeLabel osType={device.platform || device.operating_system || device.osType} />
            {device.os_version && ` ${device.os_version}`}
            {device.build && ` (${device.build})`}
          </p>
          <p className="text-ods-text-secondary text-xs mt-1">Operating System</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium">{device.needs_reboot ? 'Yes' : 'No'}</p>
          <p className="text-ods-text-secondary text-xs mt-1">Requires Reboot</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium break-all">
            {device.osUuid || device.machineId || device.id}
          </p>
          <p className="text-ods-text-secondary text-xs mt-1">UUID</p>
        </div>
        <div>
          <p className="text-ods-text-primary font-medium break-all">{device.macAddress || 'Unknown'}</p>
          <p className="text-ods-text-secondary text-xs mt-1">MAC Address</p>
        </div>
      </div>
    </div>
  );
}
