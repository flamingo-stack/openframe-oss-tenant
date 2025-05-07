/**
 * Device Adapters
 * 
 * This file contains adapter functions to transform module-specific device data
 * to the unified device model.
 */

import { UnifiedDevice, DeviceModuleType } from '../types/device';
import { 
  determinePlatform, 
  inferPlatformFromOS, 
  mapStatus, 
  getIPv4Addresses, 
  getDeviceIcon
} from './deviceUtils';

/**
 * RMM Device Interface (from tactical-rmm)
 */
export interface RMMDevice {
  agent_id: string;
  hostname: string;
  site_name?: string;
  client_name?: string;
  operating_system?: string;
  plat: string;
  status: string;
  last_seen: string;
  public_ip?: string;
  local_ips?: string;
  total_ram?: number;
  used_ram?: number;
  disk_usage?: Array<{name: string, free: number, used: number, total: number}>;
  cpu_load?: number;
  [key: string]: any;
}

/**
 * MDM Device Interface (from fleet)
 */
export interface MDMDevice {
  id: number;
  device_uuid?: string;
  hostname: string;
  display_name?: string;
  platform?: string;
  os_version?: string;
  status?: string;
  last_checkin?: string;
  mdm?: {
    enrollment_status?: string;
  };
  [key: string]: any;
}

/**
 * RAC Device Interface (from meshcentral)
 */
export interface RACDevice {
  _id: string;
  id?: string;
  name: string;
  conn: number;
  osdesc?: string;
  plat?: string;
  agct?: number;
  [key: string]: any;
}

/**
 * Convert RMM device to unified model
 */
export function fromRMMDevice(device: RMMDevice): UnifiedDevice {
  const platform = determinePlatform(device.plat);
  return {
    id: device.agent_id,
    hostname: device.hostname,
    platform,
    osVersion: device.operating_system || 'Unknown',
    status: mapStatus(device.status),
    lastSeen: device.last_seen,
    type: 'rmm' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    ipAddresses: device.local_ips ? getIPv4Addresses(device.local_ips) : [],
    moduleSpecific: device
  };
}

/**
 * Convert MDM device to unified model
 */
export function fromMDMDevice(device: MDMDevice): UnifiedDevice {
  const platform = determinePlatform(device.platform || '');
  return {
    id: device.device_uuid || device.id.toString(),
    hostname: device.hostname,
    displayName: device.display_name,
    platform,
    osVersion: device.os_version || 'Unknown',
    status: device.mdm?.enrollment_status?.toLowerCase().includes('on') ? 'online' : 
            device.mdm?.enrollment_status?.toLowerCase().includes('pending') ? 'pending' : 'offline',
    lastSeen: device.last_checkin || Date.now(),
    type: 'mdm' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    moduleSpecific: device
  };
}

/**
 * Convert RAC device to unified model
 */
export function fromRACDevice(device: RACDevice): UnifiedDevice {
  const platform = determinePlatform(device.plat || '') || 
                  inferPlatformFromOS(device.osdesc || '');
  return {
    id: device._id || device.id || '',
    hostname: device.name,
    platform,
    osVersion: device.osdesc || 'Unknown',
    status: device.conn === 1 ? 'online' : 'offline',
    lastSeen: device.agct || 0,
    type: 'rac' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    moduleSpecific: device
  };
}

/**
 * Convert devices array from any module to unified model
 */
export function convertDevices(devices: any[], moduleType: DeviceModuleType): UnifiedDevice[] {
  switch (moduleType) {
    case 'rmm': {
      const convertedDevices = devices.map(device => fromRMMDevice(device as RMMDevice));
      console.log('Converted RMM Devices:', convertedDevices);
      return convertedDevices;
    }
    case 'mdm': {
      const convertedDevices = devices.map(device => fromMDMDevice(device as MDMDevice));
      console.log('Converted MDM Devices:', convertedDevices);
      return convertedDevices;
    }
    case 'rac': {
      const convertedDevices = devices.map(device => fromRACDevice(device as RACDevice));
      console.log('Converted RAC Devices:', convertedDevices);
      return convertedDevices;
    }
    default:
      console.warn(`Unknown module type: ${moduleType}`);
      return [];
  }
}

/**
 * Attempt to automatically detect the module type and convert devices
 */
export function autoConvertDevices(devices: any[]): UnifiedDevice[] {
  if (devices.length === 0) return [];

  const sampleDevice = devices[0];

  // Check for RMM specific properties
  if ('agent_id' in sampleDevice) {
    return convertDevices(devices, 'rmm');
  }
  
  // Check for MDM specific properties
  if ('mdm' in sampleDevice || 
     ('device_uuid' in sampleDevice && 'platform' in sampleDevice)) {
    return convertDevices(devices, 'mdm');
  }
  
  // Check for RAC specific properties
  if ('conn' in sampleDevice && 'osdesc' in sampleDevice) {
    return convertDevices(devices, 'rac');
  }

  console.warn('Could not determine device type automatically');
  return [];
} 