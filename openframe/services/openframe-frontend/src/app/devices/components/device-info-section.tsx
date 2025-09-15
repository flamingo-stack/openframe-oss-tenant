'use client'

import React from 'react'
import { Device } from '../types/device.types'

interface DeviceInfoSectionProps {
  device: Device | null
}

export function DeviceInfoSection({ device }: DeviceInfoSectionProps) {
  if (!device) {
    return (
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
        <div className="text-center text-[#888888]">No device data available</div>
      </div>
    )
  }

  return (
    <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div>
        <p className="text-[#fafafa] font-medium">Laptop</p>
          <p className="text-[#888888] text-sm mb-1">Type</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">{device.manufacturer || 'Unknown'}</p>
          <p className="text-[#888888] text-xs mt-1">Manufacturer</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">{device.model || 'Unknown'}</p>
          <p className="text-[#888888] text-xs mt-1">Model</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">{device.serialNumber || device.serial_number || 'Unknown'}</p>
          <p className="text-[#888888] text-xs mt-1">Serial Number</p>
        </div>
      </div>

      <div className="border-t border-[#3a3a3a] pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div>
        <p className="text-[#fafafa] font-medium">{device.hostname || 'Unknown'}</p>
          <p className="text-[#888888] text-sm mb-1">Host Name</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">{device.organizationId || 'Unknown'}</p>
          <p className="text-[#888888] text-xs mt-1">Organization ID (Site)</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">
            {device.registeredAt ? 
              `${new Date(device.registeredAt).toLocaleDateString()} ${new Date(device.registeredAt).toLocaleTimeString()}` : 
              '2024-11-12 09:43:00'
            }
          </p>
          <p className="text-[#888888] text-xs mt-1">Registered</p>
        </div>
        <div>
          <p className="text-[#fafafa] font-medium">
            {device.updatedAt ? 
              `${new Date(device.updatedAt).toLocaleDateString()} ${new Date(device.updatedAt).toLocaleTimeString()}` :
              device.lastSeen ? 
                `${new Date(device.lastSeen).toLocaleDateString()} ${new Date(device.lastSeen).toLocaleTimeString()}` : 
                '2025-07-22 14:17:05'
            }
          </p>
          <p className="text-[#888888] text-xs mt-1">Updated</p>
        </div>
      </div>
      <div className="border-t border-[#3a3a3a] pt-4">
        <p className="text-[#fafafa] font-medium">
          {device.osUuid || device.machineId || device.id}
        </p>
        <p className="text-[#888888] text-xs mt-1">UUID</p>
      </div>
    </div>
  )
}