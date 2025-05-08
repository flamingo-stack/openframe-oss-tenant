/**
 * Unified Device Model
 * 
 * This file contains interfaces and types for a unified device model
 * that works across RMM, MDM, and RAC modules.
 */

/**
 * Device platform types supported across all modules
 */
export type DevicePlatform = 'windows' | 'darwin' | 'linux' | 'ios' | 'android' | 'unknown';

/**
 * Common device status values
 */
export type DeviceStatus = 'online' | 'offline' | 'pending' | 'overdue' | 'unknown';

/**
 * Module source identification
 */
export type DeviceModuleType = 'rmm' | 'mdm' | 'rac';

/**
 * Core unified device model that works across all modules
 */
export interface UnifiedDevice {
  // Core identifying information
  originalId?: string | number; // Original ID from source system
  id: string;                   // Unique identifier from source system
  hostname: string;             // Primary device name
  displayName?: string;         // User-friendly name (if different from hostname)
  
  // System information
  platform: DevicePlatform;     // Operating system platform
  osVersion: string;            // Operating system version
  
  // Status information
  status: DeviceStatus;         // Current connection status
  lastSeen: string | number;    // Timestamp of last connection
  
  // Metadata
  type: DeviceModuleType;       // Source module identifier
  icon?: string;                // Icon class for display
  
  // Network information
  ipAddresses?: string[];       // IP addresses associated with device
  
  // Enhanced properties for detailed view
  hardware?: {
    manufacturer?: string;      // Hardware manufacturer
    model?: string;             // Hardware model
    serialNumber?: string;      // Hardware serial number
    cpu?: {
      model?: string;           // CPU model
      cores?: number;           // Number of CPU cores
      usage?: number;           // CPU usage percentage
    };
    memory?: {
      total?: number;           // Total memory in bytes
      used?: number;            // Used memory in bytes
      free?: number;            // Free memory in bytes
    };
    storage?: Array<{
      name: string;             // Disk name
      total?: number;           // Total disk space in bytes
      used?: number;            // Used disk space in bytes
      free?: number;            // Free disk space in bytes
    }>;
    gpu?: string[];             // GPU information
  };
  
  network?: {
    ipAddresses?: string[];     // IP addresses
    publicIp?: string;          // Public IP address
    macAddresses?: string[];    // MAC addresses
    interfaces?: Array<{
      name: string;             // Interface name
      ipv4?: string[];          // IPv4 addresses
      ipv6?: string[];          // IPv6 addresses
      mac?: string;             // MAC address
    }>;
  };
  
  os?: {
    name?: string;              // OS name
    version?: string;           // OS version
    build?: string;             // OS build number
    architecture?: string;      // OS architecture
    lastBoot?: string | number; // Last boot timestamp
    uptime?: number;            // Uptime in seconds
  };
  
  security?: {
    antivirusEnabled?: boolean; // Antivirus status
    lastUpdated?: string;       // Last security update
    encryptionEnabled?: boolean; // Disk encryption status
    firewallEnabled?: boolean;  // Firewall status
    vulnerabilities?: Array<{
      cve: string;              // CVE ID
      severity: string;         // Vulnerability severity
      details?: string;         // Vulnerability details
    }>;
  };
  
  mobile?: {
    batteryLevel?: number;      // Battery level percentage
    mdmEnrollmentStatus?: string; // MDM enrollment status
    profiles?: Array<{
      id: string;
      name: string;
    }>;
    location?: {
      latitude?: number;
      longitude?: number;
      timestamp?: string;
    };
  };
  
  user?: {
    currentUser?: string;       // Current logged in user
    loggedInUsers?: string[];   // All logged in users
    domain?: string;            // User domain
  };
  
  management?: {
    site?: string;              // Management site name
    group?: string;             // Management group name
    agentVersion?: string;      // Agent version
    lastCheckin?: string | number; // Last check-in timestamp
  };

  software?: Array<{
    name: string;               // Software name
    version: string;            // Software version
    installDate?: string;       // Installation date
    publisher?: string;         // Software publisher
    source?: string;            // Installation source
  }>;
  
  asset?: {
    purchaseDate?: string;      // Purchase date
    warranty?: string;          // Warranty information
    owner?: string;             // Asset owner
    department?: string;        // Department
    location?: string;          // Physical location
    customFields?: Record<string, any>; // Custom asset fields
  };
  
  // Module-specific data preserved for specialized operations
  moduleSpecific: any;          // Original data from source module
}

/**
 * Enhanced unified device model with comprehensive properties
 */
export interface EnhancedUnifiedDevice extends UnifiedDevice {
  // Hardware information
  hardware?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    cpu?: {
      model?: string;
      cores?: number;
      logicalCores?: number;
      usage?: number;
    };
    memory?: {
      total?: number;
      used?: number;
      free?: number;
    };
    storage?: Array<{
      name: string;
      total?: number;
      used?: number;
      free?: number;
      fstype?: string;
      percent?: number;
    }>;
    gpu?: string[];
    bios?: {
      vendor?: string;
      version?: string;
    };
    motherboard?: {
      vendor?: string;
      name?: string;
      serial?: string;
      version?: string;
      identifier?: string;
    };
  };
  
  // Network information
  network?: {
    ipAddresses?: string[];
    publicIp?: string;
    macAddresses?: string[];
    hostName?: string;
    interfaces?: Array<{
      name: string;
      ipv4?: string[];
      ipv6?: string[];
      mac?: string;
      status?: string;
      gateway?: string;
      subnet?: string;
    }>;
  };
  
  // Operating system information
  os?: {
    name?: string;
    version?: string;
    build?: string;
    architecture?: string;
    lastBoot?: string | number;
    uptime?: number;
    codeName?: string;
  };
  
  // Security information
  security?: {
    antivirusEnabled?: boolean;
    firewallEnabled?: boolean;
    encryptionEnabled?: boolean;
    lastUpdated?: string;
    vulnerabilities?: Array<{
      cve: string;
      severity: string;
      details?: string;
      detailsLink?: string;
      createdAt?: string;
    }>;
    windowsSecurityCenter?: {
      antiVirus?: string;
      autoUpdate?: string;
      firewall?: string;
    };
  };
  
  // User information
  user?: {
    currentUser?: string;
    loggedInUsers?: string[];
    loggedOutUsers?: string[];
    domain?: string;
    users?: Array<{
      uid?: number;
      username: string;
      type?: string;
      groupname?: string;
      shell?: string;
    }>;
  };
  
  // Asset information
  asset?: {
    purchaseDate?: string;
    warranty?: string;
    owner?: string;
    department?: string;
    location?: string;
    customFields?: Record<string, any>;
  };
  
  // Mobile device specific information
  mobile?: {
    batteryLevel?: number;
    batteryHealth?: string;
    batteryCycleCount?: number;
    mdmEnrollmentStatus?: string;
    profiles?: Array<{
      id: string;
      name: string;
    }>;
    location?: {
      latitude?: number;
      longitude?: number;
      timestamp?: string;
    };
    deviceStatus?: string;
    pendingAction?: string;
  };
  
  // Device power status information
  power?: {
    state?: string;
    battery?: {
      state?: string;
      isCharging?: boolean;
    };
  };
  
  management?: {
    site?: string;
    group?: string;
    agentVersion?: string;
    lastCheckin?: string | number;
    orbitVersion?: string;
    fleetDesktopVersion?: string;
    osqueryVersion?: string;
    lastEnrolledAt?: string;
    meshId?: string;
    agentDetails?: {
      id?: number;
      capabilities?: number;
      core?: string;
      isRoot?: boolean;
    };
  };

  // Software information
  software?: Array<{
    id?: number;
    name: string;
    version: string;
    installDate?: string;
    lastOpenedAt?: string;
    publisher?: string;
    source?: string;
    bundleIdentifier?: string;
    browser?: string;
    generatedCpe?: string;
    installedPaths?: string[];
    vulnerabilities?: Array<{
      cve: string;
      details?: string;
      detailsLink?: string;
      severity?: string;
      createdAt?: string;
    }>;
  }>;
}

/**
 * RMM-specific extended device properties
 */
export interface RMMExtendedDevice {
  agent_id: string;
  client?: {
    client_id?: number;
    site_id?: number;
    client_name?: string;
    site_name?: string;
  };
  monitoring?: {
    alertsEnabled?: boolean;
    checkInterval?: number;
    scripts?: Array<{id: string; name: string}>;
  };
  software?: {
    installedSoftware?: Array<{name: string; version: string}>;
    pendingUpdates?: number;
  };
  // Additional RMM-specific properties
}

/**
 * MDM-specific extended device properties
 */
export interface MDMExtendedDevice {
  device_uuid?: string;
  mdm?: {
    enrollmentStatus?: string;
    profiles?: Array<{id: string; name: string}>;
    commands?: Array<{id: string; name: string}>;
  };
  hardware?: {
    udid?: string;
    buildVersion?: string;
    deviceName?: string;
    model?: string;
    modelName?: string;
    osVersion?: string;
    productName?: string;
    serialNumber?: string;
    imei?: string;
  };
  // Additional MDM-specific properties
}

/**
 * RAC-specific extended device properties
 */
export interface RACExtendedDevice {
  _id: string;
  meshid?: string;
  conn?: number;
  pwr?: number;
  ag?: {
    caps?: number;
    time?: number;
  };
  agent?: {
    ver?: number;
    id?: number;
    caps?: number;
    core?: string;
    root?: boolean;
  };
  lastbootuptime?: number;
  sessions?: {
    battery?: {
      state?: string;
    };
  };
  sessions_list?: Array<{
    id: string;
    startTime: number;
    user: string;
  }>;
  lusers?: string[];
  groupname?: string;
  host?: string;
  type?: string;
  mtype?: number;
  icon?: number;
  name?: string;
  rname?: string;
  domain?: string;
  // Additional RAC-specific properties
}

/**
 * Extended device properties common to multiple modules
 * but not universal enough for the core model
 */
export interface ExtendedDeviceProperties {
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  memory?: {
    total?: number;
    used?: number;
  };
  storage?: {
    total?: number;
    used?: number;
  };
  cpuUsage?: number;
  batteryLevel?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    lastUpdated?: string | number;
  };
}

/**
 * Type guard to check if a device is from RMM module
 */
export function isRMMDevice(device: UnifiedDevice): boolean {
  return device.type === 'rmm';
}

/**
 * Type guard to check if a device is from MDM module
 */
export function isMDMDevice(device: UnifiedDevice): boolean {
  return device.type === 'mdm';
}

/**
 * Type guard to check if a device is from RAC module
 */
export function isRACDevice(device: UnifiedDevice): boolean {
  return device.type === 'rac';
}

/**
 * Type guard to check if a device is an enhanced device
 */
export function isEnhancedDevice(device: UnifiedDevice): device is EnhancedUnifiedDevice {
  return (device as EnhancedUnifiedDevice).hardware !== undefined ||
         (device as EnhancedUnifiedDevice).network !== undefined ||
         (device as EnhancedUnifiedDevice).os !== undefined;
}

/**
 * Helper function to get the original device data with type safety
 */
export function getOriginalDevice<T>(device: UnifiedDevice): T {
  return device.moduleSpecific as T;
} 