# Unified Device Model Proposal

## Common Device Interface

```typescript
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
  
  // Module-specific data preserved for specialized operations
  moduleSpecific: any;          // Original data from source module
}
```

## Adapter Functions

Each module will have an adapter function to convert from its specific model to the unified model:

```typescript
/**
 * Convert RMM device to unified model
 */
export function fromRMMDevice(device: RMMDevice): UnifiedDevice {
  return {
    id: device.agent_id,
    hostname: device.hostname,
    platform: determinePlatform(device.plat),
    osVersion: device.operating_system || 'Unknown',
    status: mapStatus(device.status),
    lastSeen: device.last_seen,
    type: 'rmm',
    moduleSpecific: device
  };
}

/**
 * Convert MDM device to unified model
 */
export function fromMDMDevice(device: MDMDevice): UnifiedDevice {
  return {
    id: device.device_uuid || device.id,
    hostname: device.hostname,
    displayName: device.display_name,
    platform: determinePlatform(device.platform),
    osVersion: device.os_version || 'Unknown',
    status: mapStatus(device.status),
    lastSeen: device.last_checkin || Date.now(),
    type: 'mdm',
    moduleSpecific: device
  };
}

/**
 * Convert RAC device to unified model
 */
export function fromRACDevice(device: RACDevice): UnifiedDevice {
  return {
    id: device._id || device.id,
    hostname: device.name,
    platform: determinePlatform(device.plat || inferPlatformFromOS(device.osdesc)),
    osVersion: device.osdesc || 'Unknown',
    status: device.conn === 1 ? 'online' : 'offline',
    lastSeen: device.agct || 0,
    type: 'rac',
    moduleSpecific: device
  };
}
```

## Helper Functions

The implementation will include utility functions for common operations:

```typescript
/**
 * Determine platform from various source formats
 */
export function determinePlatform(platform: string): DevicePlatform {
  const normalizedPlatform = (platform || '').toLowerCase();
  
  if (normalizedPlatform.includes('win')) return 'windows';
  if (normalizedPlatform.includes('darwin') || normalizedPlatform.includes('mac')) return 'darwin';
  if (normalizedPlatform.includes('linux')) return 'linux';
  if (normalizedPlatform.includes('ios')) return 'ios';
  if (normalizedPlatform.includes('android')) return 'android';
  
  return 'unknown';
}

/**
 * Map various status values to standard format
 */
export function mapStatus(status: string): DeviceStatus {
  const normalizedStatus = (status || '').toLowerCase();
  
  if (normalizedStatus.includes('online')) return 'online';
  if (normalizedStatus.includes('offline')) return 'offline';
  if (normalizedStatus.includes('pending')) return 'pending';
  if (normalizedStatus.includes('overdue')) return 'overdue';
  
  return 'unknown';
}

/**
 * Get device icon based on platform
 */
export function getDeviceIcon(platform: DevicePlatform): string {
  switch(platform) {
    case 'windows': return 'pi pi-microsoft';
    case 'darwin': return 'pi pi-apple';
    case 'linux': return 'pi pi-server';
    case 'ios': return 'pi pi-mobile';
    case 'android': return 'pi pi-android';
    default: return 'pi pi-desktop';
  }
}

/**
 * Format timestamp consistently
 */
export function formatDeviceTimestamp(timestamp: string | number): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
}
```

## Implementation Approach

1. Create these interfaces and functions in dedicated files
2. Update each module's device component to use the adapters
3. Create common device UI components that use this unified model
4. Gradually transition the codebase to use the unified model

## Benefits

1. Consistent device representation across modules
2. Reusable UI components
3. Simplified filtering and searching
4. Easier to add new device types in the future
5. Cleaner code with better type safety 