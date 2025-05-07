/**
 * Device Adapters
 * 
 * This file contains adapter functions to transform module-specific device data
 * to the unified device model.
 */

import { 
  UnifiedDevice, 
  DeviceModuleType, 
  EnhancedUnifiedDevice,
  RMMExtendedDevice,
  MDMExtendedDevice,
  RACExtendedDevice,
  DeviceStatus
} from '../types/device';
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
  cpu_cores?: number;
  boot_time?: string | number;
  hardware_info?: {
    serial_number?: string;
    cpu?: string;
    motherboard?: string;
    manufacturer?: string;
  };
  antivirus?: {
    status?: string;
    last_updated?: string;
  };
  logged_in_username?: string;
  description?: string;
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
  computer_name?: string;
  platform?: string;
  os_version?: string;
  status?: string;
  last_checkin?: string;
  seen_time?: string;
  uuid?: string;
  build?: string;
  platform_like?: string;
  uptime?: number;
  memory?: number;
  cpu_type?: string;
  cpu_subtype?: string;
  cpu_brand?: string;
  cpu_physical_cores?: number;
  cpu_logical_cores?: number;
  hardware_vendor?: string;
  hardware_model?: string;
  hardware_version?: string;
  hardware_serial?: string;
  public_ip?: string;
  primary_ip?: string;
  primary_mac?: string;
  gigs_disk_space_available?: number;
  percent_disk_space_available?: number;
  gigs_total_disk_space?: number;
  last_restarted_at?: string;
  mdm?: {
    enrollment_status?: string;
    profiles?: Array<{id: string; name: string}>;
    dep_profile_error?: boolean;
    server_url?: string;
    name?: string;
    encryption_key_available?: boolean;
    connected_to_fleet?: boolean;
  };
  hardware?: {
    uuid?: string;
    serial_number?: string;
    model?: string;
    cpu_type?: string;
    cpu_physical_cores?: number;
    cpu_logical_cores?: number;
    physical_memory?: number;
    build_version?: string;
    platform_like?: string;
  };
  battery?: {
    cycle_count?: number;
    health?: string;
    percentage?: number;
  };
  disk_encryption?: {
    enabled?: boolean;
    status?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    timestamp?: string;
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
  mtype?: number;
  users?: string[];
  ip?: string[];
  mac?: string[];
  agent?: {
    ver?: string;
    caps?: number;
  };
  meshid?: string;
  domain?: string;
  [key: string]: any;
}

/**
 * Convert RMM device to enhanced unified model
 */
function fromRMMDevice(device: RMMDevice): EnhancedUnifiedDevice {
  const platform = determinePlatform(device.plat);
  return {
    // Base unified device properties
    id: device.agent_id,
    hostname: device.hostname,
    platform,
    osVersion: device.operating_system || 'Unknown',
    status: mapStatus(device.status),
    lastSeen: device.last_seen,
    type: 'rmm' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    ipAddresses: device.local_ips ? getIPv4Addresses(device.local_ips) : [],
    
    // Set the original ID for direct reference
    originalId: device.agent_id,
    
    // Enhanced properties
    hardware: {
      manufacturer: device.hardware_info?.manufacturer,
      model: device.hardware_info?.motherboard,
      serialNumber: device.hardware_info?.serial_number,
      cpu: {
        model: device.hardware_info?.cpu,
        cores: device.cpu_cores,
        usage: device.cpu_load,
      },
      memory: {
        total: device.total_ram,
        used: device.used_ram,
        free: device.total_ram && device.used_ram ? device.total_ram - device.used_ram : undefined,
      },
      storage: device.disk_usage?.map(disk => ({
        name: disk.name,
        total: disk.total,
        used: disk.used,
        free: disk.free,
      })) || [],
    },
    
    network: {
      ipAddresses: device.local_ips ? getIPv4Addresses(device.local_ips) : [],
      publicIp: device.public_ip,
    },
    
    os: {
      name: device.operating_system?.split(' ')[0],
      version: device.operating_system,
      lastBoot: device.boot_time,
    },
    
    security: {
      antivirusEnabled: device.antivirus?.status?.toLowerCase() === 'active',
      lastUpdated: device.antivirus?.last_updated,
    },
    
    user: {
      currentUser: device.logged_in_username,
    },
    
    management: {
      site: device.site_name,
      group: device.client_name,
    },
    
    // Preserve the original data
    moduleSpecific: device,
  };
}

/**
 * Convert MDM device to enhanced unified model
 */
function fromMDMDevice(device: MDMDevice): EnhancedUnifiedDevice {
  const platform = determinePlatform(device.platform || '');
  
  // Map status to correct DeviceStatus value
  let deviceStatus: DeviceStatus = 'offline';
  if (device.status === 'online') {
    deviceStatus = 'online';
  } else if (device.status === 'pending') {
    deviceStatus = 'pending';
  }
  return {
    // Base unified device properties
    id: device.uuid || device.device_uuid || device.id.toString(),
    hostname: device.hostname,
    displayName: device.display_name || device.computer_name,
    platform,
    osVersion: device.os_version || 'Unknown',
    // Use the direct status field from API response with correct typing
    status: deviceStatus,
    // Use seen_time as lastSeen if available
    lastSeen: device.seen_time || device.last_checkin || Date.now(),
    type: 'mdm' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    ipAddresses: device.primary_ip ? [device.primary_ip] : [],
    
    // Set the original ID for direct reference
    originalId: device.id,
    
    // Enhanced properties
    hardware: {
      serialNumber: device.hardware_serial || device.hardware?.serial_number,
      model: device.hardware_model || device.hardware?.model,
      manufacturer: device.hardware_vendor,
      cpu: {
        model: device.cpu_brand || device.cpu_type || device.hardware?.cpu_type,
        cores: device.cpu_physical_cores || device.hardware?.cpu_physical_cores,
        usage: undefined, // Add usage property which is in the interface
      },
      memory: {
        total: device.memory || device.hardware?.physical_memory,
      },
      storage: device.gigs_total_disk_space ? [
        {
          name: "Main Disk",
          total: device.gigs_total_disk_space * 1024 * 1024 * 1024, // Convert GB to bytes
          free: device.gigs_disk_space_available ? device.gigs_disk_space_available * 1024 * 1024 * 1024 : undefined,
          used: device.gigs_total_disk_space && device.gigs_disk_space_available ? 
            (device.gigs_total_disk_space - device.gigs_disk_space_available) * 1024 * 1024 * 1024 : undefined,
        }
      ] : [],
    },
    
    network: {
      ipAddresses: device.primary_ip ? [device.primary_ip] : [],
      publicIp: device.public_ip,
      macAddresses: device.primary_mac ? [device.primary_mac] : [],
    },
    
    os: {
      name: device.os_version?.split(' ')[0],
      version: device.os_version,
      build: device.build || device.hardware?.build_version,
      lastBoot: device.last_restarted_at,
    },
    
    security: {
      encryptionEnabled: device.disk_encryption?.enabled,
    },
    
    mobile: {
      batteryLevel: device.battery?.percentage,
      mdmEnrollmentStatus: device.mdm?.enrollment_status,
    },
    
    asset: device.location ? {
      location: device.location.latitude && device.location.longitude 
        ? `${device.location.latitude},${device.location.longitude}` 
        : undefined,
      customFields: {
        locationLatitude: device.location.latitude,
        locationLongitude: device.location.longitude,
        locationTimestamp: device.location.timestamp,
      }
    } : undefined,
    
    management: {
      site: device.mdm?.name, // Use existing fields in the interface
      group: undefined,
      agentVersion: device.mdm?.server_url, // Store server URL as agent version for now
      lastCheckin: device.seen_time,
    },
    
    // Preserve the original data
    moduleSpecific: device,
  };
}

/**
 * Convert RAC device to enhanced unified model
 */
function fromRACDevice(device: RACDevice): EnhancedUnifiedDevice {
  const platform = determinePlatform(device.plat || '') || 
                  inferPlatformFromOS(device.osdesc || '');
  return {
    // Base unified device properties
    id: device._id || device.id || '',
    hostname: device.rname ? device.rname : device.name,
    platform,
    osVersion: device.osdesc || 'Unknown',
    status: device.conn === 1 ? 'online' : 'offline',
    lastSeen: device.agct || 0,
    type: 'rac' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    
    // Set the original ID for direct reference
    originalId: device._id || device.id,
    
    // Enhanced properties
    network: {
      ipAddresses: device.ip || [],
      macAddresses: device.mac || [],
    },
    
    user: {
      loggedInUsers: device.users,
      domain: device.domain,
    },
    
    management: {
      agentVersion: device.agent?.ver,
    },
    
    // Preserve the original data
    moduleSpecific: device,
  };
}

/**
 * Convert devices array from any module to unified model
 */
export function convertDevices(devices: any[], moduleType: DeviceModuleType): EnhancedUnifiedDevice[] {
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
export function autoConvertDevices(devices: any[]): EnhancedUnifiedDevice[] {
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