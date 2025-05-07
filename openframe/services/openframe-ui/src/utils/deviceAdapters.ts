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
  DeviceStatus,
  DevicePlatform
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
  cpu_model?: string[];
  make_model?: string;
  physical_disks?: string[];
  graphics?: string;
  software?: Array<{name: string, version: string}>;
  wmi_detail?: {
    cpus?: string[];
    gpus?: string[];
    disks?: string[];
    local_ips?: string[];
    make_model?: string;
    serialnumber?: string;
  };
  version?: string;
  disks?: Array<{
    free: string;
    used: string;
    total: string;
    device: string;
    fstype: string;
    percent: number;
  }>;
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
    device_status?: string;
    pending_action?: string;
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
  software?: Array<{
    id?: number;
    name: string;
    version: string;
    source?: string;
    browser?: string;
    bundle_identifier?: string;
    generated_cpe?: string;
    vulnerabilities?: Array<{
      cve: string;
      details_link?: string;
      created_at?: string;
    }>;
    installed_paths?: string[];
    last_opened_at?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  software_updated_at?: string;
  detail_updated_at?: string;
  label_updated_at?: string;
  policy_updated_at?: string;
  last_enrolled_at?: string;
  display_text?: string;
  users?: Array<{
    uid?: number;
    username: string;
    type?: string;
    groupname?: string;
    shell?: string;
  }>;
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
  General?: {
    "Server Name"?: string;
    "Computer Name"?: string;
    Hostname?: string;
    "IP Address"?: string;
    Icon?: number;
    AntiVirus?: string[];
    WindowsSecurityCenter?: {
      antiVirus?: string;
      autoUpdate?: string;
      firewall?: string;
    };
  };
  "Operating System"?: {
    Name?: string;
    Version?: string;
    Architecture?: string;
  };
  "Mesh Agent"?: {
    "Mesh Agent"?: string;
    "Last agent connection"?: string;
    "Last agent address"?: string;
  };
  Networking?: Record<string, {
    "MAC Layer"?: string;
    "IPv4 Layer"?: string;
    "IPv6 Layer"?: string;
  }>;
  BIOS?: {
    Vendor?: string;
    Version?: string;
  };
  Motherboard?: {
    Vendor?: string;
    Name?: string;
    Serial?: string;
    Version?: string;
    Identifier?: string;
    CPU?: string;
    GPU1?: string;
  };
  Memory?: Record<string, {
    "Capacity/Speed"?: string;
    "Part Number"?: string;
  }>;
  Storage?: Record<string, {
    Capacity?: string;
  }>;
  rname?: string;
  [key: string]: any;
}

/**
 * Convert RMM device to enhanced unified model
 */
function fromRMMDevice(device: RMMDevice): EnhancedUnifiedDevice {
  const platform = determinePlatform(device.plat);
  
  // Parse storage information
  const storage = [];
  if (device.disk_usage && device.disk_usage.length > 0) {
    storage.push(...device.disk_usage.map(disk => ({
      name: disk.name,
      total: disk.total,
      used: disk.used,
      free: disk.free,
    })));
  } else if (device.disks && device.disks.length > 0) {
    storage.push(...device.disks.map(disk => {
      // Parse size strings (e.g. "598.1 GB") to bytes
      const parseSize = (sizeStr: string): number => {
        try {
          const [value, unit] = sizeStr.split(' ');
          const numValue = parseFloat(value);
          const multiplier = unit.toUpperCase() === 'GB' ? 1024 * 1024 * 1024 :
                            unit.toUpperCase() === 'MB' ? 1024 * 1024 :
                            unit.toUpperCase() === 'KB' ? 1024 : 1;
          return numValue * multiplier;
        } catch (e) {
          return 0;
        }
      };
      
      return {
        name: disk.device,
        total: parseSize(disk.total),
        used: parseSize(disk.used),
        free: parseSize(disk.free),
        fstype: disk.fstype,
        percent: disk.percent
      };
    }));
  }

  // Extract GPU information
  const gpuInfo = [];
  if (device.graphics) {
    gpuInfo.push(device.graphics);
  }
  if (device.wmi_detail?.gpus && device.wmi_detail.gpus.length > 0) {
    gpuInfo.push(...device.wmi_detail.gpus);
  }

  // Build software inventory
  const software = device.software || [];
  
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
      manufacturer: device.hardware_info?.manufacturer || device.wmi_detail?.make_model?.split('\\')[0],
      model: device.hardware_info?.motherboard || device.make_model || device.wmi_detail?.make_model,
      serialNumber: device.hardware_info?.serial_number || device.wmi_detail?.serialnumber,
      cpu: {
        model: device.hardware_info?.cpu || (device.cpu_model && device.cpu_model.length > 0 ? device.cpu_model[0] : undefined),
        cores: device.cpu_cores,
        usage: device.cpu_load,
      },
      memory: {
        total: device.total_ram,
        used: device.used_ram,
        free: device.total_ram && device.used_ram ? device.total_ram - device.used_ram : undefined,
      },
      storage: storage,
      gpu: gpuInfo.length > 0 ? gpuInfo : undefined,
    },
    
    network: {
      ipAddresses: device.local_ips ? getIPv4Addresses(device.local_ips) : (device.wmi_detail?.local_ips || []),
      publicIp: device.public_ip,
    },
    
    os: {
      name: device.operating_system?.split(' ')[0],
      version: device.operating_system,
      lastBoot: device.boot_time,
      architecture: platform === 'windows' ? 'x64' : platform === 'darwin' ? 'arm64' : undefined,
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
      agentVersion: device.version,
    },
    
    software: software.map(sw => ({
      name: sw.name,
      version: sw.version,
      source: 'rmm'
    })),
    
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
  
  // Build storage information
  const storage = [];
  if (device.gigs_total_disk_space) {
    storage.push({
      name: "Main Disk",
      total: device.gigs_total_disk_space * 1024 * 1024 * 1024, // Convert GB to bytes
      free: device.gigs_disk_space_available ? device.gigs_disk_space_available * 1024 * 1024 * 1024 : undefined,
      used: device.gigs_total_disk_space && device.gigs_disk_space_available ? 
        (device.gigs_total_disk_space - device.gigs_disk_space_available) * 1024 * 1024 * 1024 : undefined,
    });
  }
  
  // Build software inventory
  const software = [];
  if (device.software && device.software.length > 0) {
    software.push(...device.software.map(sw => ({
      id: sw.id,
      name: sw.name,
      version: sw.version,
      source: sw.source || 'mdm',
      installDate: sw.last_opened_at,
      lastOpenedAt: sw.last_opened_at,
      bundleIdentifier: sw.bundle_identifier,
      browser: sw.browser,
      generatedCpe: sw.generated_cpe,
      installedPaths: sw.installed_paths,
      vulnerabilities: sw.vulnerabilities?.map(vuln => ({
        cve: vuln.cve,
        detailsLink: vuln.details_link,
        createdAt: vuln.created_at,
        severity: 'critical' // Default to critical, could be enhanced
      }))
    })));
  }
  
  // Build users information
  const users = [];
  if (device.users && device.users.length > 0) {
    users.push(...device.users.map(user => user.username));
  }
  
  // Process vulnerabilities
  const vulnerabilities: Array<{cve: string; severity: string; details?: string}> = [];
  if (device.software && device.software.length > 0) {
    device.software.forEach(sw => {
      if (sw.vulnerabilities && sw.vulnerabilities.length > 0) {
        vulnerabilities.push(...sw.vulnerabilities.map(vuln => ({
          cve: vuln.cve,
          severity: 'critical', // Default severity, could be enhanced
          details: `${sw.name} ${sw.version} - ${vuln.details_link || 'No details'}`
        })));
      }
    });
  }
  
  return {
    // Base unified device properties
    id: device.uuid || device.device_uuid || (device.id !== undefined ? device.id.toString() : ''),
    hostname: device.hostname,
    displayName: device.display_name || device.computer_name,
    platform,
    osVersion: device.os_version || 'Unknown',
    // Use the direct status field from API response with correct typing
    status: deviceStatus,
    // Use seen_time as lastSeen if available
    lastSeen: device.seen_time || device.last_checkin || Date.now().toString(),
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
        logicalCores: device.cpu_logical_cores || device.hardware?.cpu_logical_cores,
        usage: undefined, // MDM doesn't provide CPU usage
      },
      memory: {
        total: device.memory || device.hardware?.physical_memory,
      },
      storage: storage,
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
      architecture: device.cpu_type || device.hardware?.cpu_type,
      lastBoot: device.last_restarted_at,
      uptime: device.uptime,
      codeName: device.code_name,
    },
    
    security: {
      encryptionEnabled: device.disk_encryption?.enabled,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
    },
    
    mobile: {
      batteryLevel: device.battery?.percentage,
      batteryHealth: device.battery?.health,
      batteryCycleCount: device.battery?.cycle_count,
      mdmEnrollmentStatus: device.mdm?.enrollment_status,
      profiles: device.mdm?.profiles,
      location: device.location,
      deviceStatus: device.mdm?.device_status,
      pendingAction: device.mdm?.pending_action,
    },
    
    user: {
      loggedInUsers: users,
      users: device.users,
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
      agentVersion: device.orbit_version || device.osquery_version,
      lastCheckin: device.seen_time,
      orbitVersion: device.orbit_version,
      fleetDesktopVersion: device.fleet_desktop_version,
      osqueryVersion: device.osquery_version,
      lastEnrolledAt: device.last_enrolled_at,
    },
    
    software: software,
    
    // Preserve the original data
    moduleSpecific: device,
  };
}

/**
 * Convert RAC device to enhanced unified model
 */
function fromRACDevice(device: RACDevice): EnhancedUnifiedDevice {
  // Determine platform - try multiple methods to ensure accuracy
  let platform: DevicePlatform = 'unknown';
  
  // Method 1: Use plat field if available
  if (device.plat) {
    platform = determinePlatform(device.plat);
  }
  
  // Method 2: Use icon field as a hint (MeshCentral specific)
  if (platform === 'unknown' && device.icon !== undefined) {
    // MeshCentral icon mapping: 
    // 1=Linux, 2=Mac, 3=Android, 4=iOS, 5=ChromeOS, 8=Windows
    switch (device.icon) {
      case 8: platform = 'windows'; break;
      case 2: platform = 'darwin'; break;
      case 1: platform = 'linux'; break;
      case 3: platform = 'android'; break;
      case 4: platform = 'ios'; break;
    }
  }

  // Method 3: Use OS description as fallback
  if (platform === 'unknown' && device.osdesc) {
    platform = inferPlatformFromOS(device.osdesc);
  }
  
  // Method 4: Check Operating System data if available
  if (platform === 'unknown' && device["Operating System"]?.Version) {
    platform = inferPlatformFromOS(device["Operating System"].Version);
  }

  // Build storage information
  const storage = [];
  if (device.Storage) {
    for (const [diskName, diskInfo] of Object.entries(device.Storage)) {
      if (diskInfo.Capacity) {
        // Parse capacity like "65530Mb"
        let total = 0;
        try {
          const match = diskInfo.Capacity.match(/(\d+)(Mb|Gb|Tb|Kb|B)/i);
          if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();
            
            if (unit === 'kb') total = value * 1024;
            else if (unit === 'mb') total = value * 1024 * 1024;
            else if (unit === 'gb') total = value * 1024 * 1024 * 1024;
            else if (unit === 'tb') total = value * 1024 * 1024 * 1024 * 1024;
            else total = value;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        
        storage.push({
          name: diskName,
          total,
        });
      }
    }
  }
  
  // Build network interfaces
  const interfaces = [];
  if (device.Networking) {
    for (const [ifaceName, ifaceInfo] of Object.entries(device.Networking)) {
      const ipv4 = [];
      const ipv6 = [];
      let mac = '';
      let gateway = '';
      let subnet = '';
      
      // Parse MAC Layer (format: "MAC: 00:0C:29:4F:2E:C7")
      if (ifaceInfo["MAC Layer"]) {
        const macMatch = ifaceInfo["MAC Layer"].match(/MAC: ([0-9A-F:]+)/i);
        if (macMatch) mac = macMatch[1];
      }
      
      // Parse IPv4 Layer (format: "IP: 172.16.181.131, Mask: 255.255.255.0, Gateway: 172.16.181.2")
      if (ifaceInfo["IPv4 Layer"]) {
        const ipMatch = ifaceInfo["IPv4 Layer"].match(/IP: ([0-9.]+)/i);
        if (ipMatch) ipv4.push(ipMatch[1]);
        
        const subnetMatch = ifaceInfo["IPv4 Layer"].match(/Mask: ([0-9.]+)/i);
        if (subnetMatch) subnet = subnetMatch[1];
        
        const gatewayMatch = ifaceInfo["IPv4 Layer"].match(/Gateway: ([0-9.]+)/i);
        if (gatewayMatch) gateway = gatewayMatch[1];
      }
      
      // Parse IPv6 Layer (format: "IP: fe80::db16:a6af:8a84:a83f%11")
      if (ifaceInfo["IPv6 Layer"]) {
        const ipv6Match = ifaceInfo["IPv6 Layer"].match(/IP: ([0-9a-f:]+%?\d*)/i);
        if (ipv6Match) ipv6.push(ipv6Match[1]);
      }
      
      interfaces.push({
        name: ifaceName,
        ipv4,
        ipv6,
        mac,
        gateway,
        subnet
      });
    }
  }
  
  // Extract GPU information
  const gpuInfo = [];
  if (device.Motherboard?.GPU1) {
    gpuInfo.push(device.Motherboard.GPU1);
  }
  
  // Extract memory information
  let totalMemory = 0;
  if (device.Memory) {
    for (const [_, memInfo] of Object.entries(device.Memory)) {
      if (memInfo["Capacity/Speed"]) {
        const match = memInfo["Capacity/Speed"].match(/(\d+) Mb/i);
        if (match) {
          totalMemory += parseInt(match[1], 10) * 1024 * 1024; // Convert MB to bytes
        }
      }
    }
  }
  
  // Extract security information
  const securityInfo = {
    antivirusEnabled: false,
    firewallEnabled: false,
    windowsSecurityCenter: undefined as any,
  };
  
  if (device.General?.AntiVirus && device.General.AntiVirus.length > 0) {
    const avInfo = device.General.AntiVirus[0];
    securityInfo.antivirusEnabled = avInfo.toLowerCase().includes('enabled');
  }
  
  if (device.General?.WindowsSecurityCenter) {
    securityInfo.firewallEnabled = device.General.WindowsSecurityCenter.firewall === 'OK';
    securityInfo.windowsSecurityCenter = device.General.WindowsSecurityCenter;
  }
  
  return {
    // Base unified device properties
    id: device._id || device.id || '',
    hostname: device.rname || device.name || device.General?.Hostname || '',
    displayName: device.General?.["Computer Name"] || device.General?.["Server Name"],
    platform,
    osVersion: device.osdesc || device["Operating System"]?.Version || 'Unknown',
    status: device.conn === 1 ? 'online' : 'offline',
    lastSeen: device.agct || device["Mesh Agent"]?.["Last agent connection"] || 0,
    type: 'rac' as DeviceModuleType,
    icon: getDeviceIcon(platform),
    ipAddresses: device.ip || [],
    
    // Set the original ID for direct reference
    originalId: device._id || device.id,
    
    // Enhanced properties
    hardware: {
      manufacturer: device.Motherboard?.Vendor || device.BIOS?.Vendor,
      model: device.Motherboard?.Name,
      serialNumber: device.Motherboard?.Serial,
      cpu: {
        model: device.Motherboard?.CPU,
      },
      memory: {
        total: totalMemory > 0 ? totalMemory : undefined,
      },
      storage: storage,
      gpu: gpuInfo.length > 0 ? gpuInfo : undefined,
      bios: device.BIOS ? {
        vendor: device.BIOS.Vendor,
        version: device.BIOS.Version
      } : undefined,
      motherboard: device.Motherboard ? {
        vendor: device.Motherboard.Vendor,
        name: device.Motherboard.Name,
        serial: device.Motherboard.Serial,
        version: device.Motherboard.Version,
        identifier: device.Motherboard.Identifier
      } : undefined,
    },
    
    network: {
      ipAddresses: device.ip || [],
      macAddresses: device.mac || [],
      interfaces: interfaces.length > 0 ? interfaces : undefined,
    },
    
    os: {
      name: device["Operating System"]?.Name,
      version: device["Operating System"]?.Version,
      architecture: device["Operating System"]?.Architecture,
    },
    
    security: securityInfo,
    
    user: {
      loggedInUsers: device.users,
      domain: device.domain,
    },
    
    management: {
      agentVersion: device.agent?.ver || device["Mesh Agent"]?.["Mesh Agent"],
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