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
 * Helper function to get the original device data with type safety
 */
export function getOriginalDevice<T>(device: UnifiedDevice): T {
  return device.moduleSpecific as T;
} 