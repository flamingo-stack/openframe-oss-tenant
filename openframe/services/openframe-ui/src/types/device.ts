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
      name?: string;
      total?: number;
      used?: number;
      free?: number;
    }>;
  };
  
  // Network information
  network?: {
    ipAddresses?: string[];
    publicIp?: string;
    macAddresses?: string[];
    interfaces?: Array<{
      name?: string;
      ip?: string;
      mac?: string;
      status?: string;
    }>;
  };
  
  // Operating system information
  os?: {
    name?: string;
    version?: string;
    build?: string;
    lastBoot?: string | number;
  };
  
  // Security information
  security?: {
    antivirusEnabled?: boolean;
    firewallEnabled?: boolean;
    encryptionEnabled?: boolean;
    lastUpdated?: string;
  };
  
  // User information
  user?: {
    currentUser?: string;
    loggedInUsers?: string[];
    domain?: string;
  };
  
  // Asset information
  asset?: {
    purchaseDate?: string;
    warrantyExpiration?: string;
    location?: string;
    department?: string;
    assignedUser?: string;
    customFields?: Record<string, any>;
  };
  
  // Mobile device specific information
  mobile?: {
    phoneNumber?: string;
    imei?: string;
    batteryLevel?: number;
    mdmEnrollmentStatus?: string;
  };
  
  // Management information
  management?: {
    site?: string;
    group?: string;
    agentVersion?: string;
    lastCheckin?: string | number;
  };
  
  // Original module-specific data
  moduleSpecific: any;
  
  // Original module-specific ID for direct reference
  originalId?: string | number;
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
  sessions?: Array<{
    id: string;
    startTime: number;
    user: string;
  }>;
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