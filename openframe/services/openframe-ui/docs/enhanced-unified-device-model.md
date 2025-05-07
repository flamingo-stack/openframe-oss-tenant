# Enhanced Unified Device Model

This document provides documentation for the enhanced unified device model in OpenFrame, which extends the base unified device model with more comprehensive device information across RMM, MDM, and RAC modules.

## Overview

The enhanced unified device model builds on the existing unified device model to provide a more complete picture of devices across all management systems. It maintains backward compatibility with the base model while offering access to a richer set of device properties.

## Core Components

### 1. Enhanced Interface

The enhanced model extends the base `UnifiedDevice` interface with additional nested objects for various device aspects:

```typescript
export interface EnhancedUnifiedDevice extends UnifiedDevice {
  // Hardware information
  hardware?: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    biosVersion?: string;
    cpu?: {
      model?: string;
      cores?: number;
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
    macAddresses?: string[];
    interfaces?: Array<{
      name?: string;
      ipAddress?: string;
      macAddress?: string;
      isUp?: boolean;
    }>;
    publicIp?: string;
  };
  
  // Operating system information
  os?: {
    name?: string;
    version?: string;
    build?: string;
    architecture?: string;
    kernel?: string;
    lastBoot?: string | number;
  };
  
  // Security information
  security?: {
    antivirusEnabled?: boolean;
    firewallEnabled?: boolean;
    encryptionEnabled?: boolean;
    patchStatus?: string;
    lastUpdated?: string | number;
  };
  
  // User information
  user?: {
    currentUser?: string;
    domain?: string;
    lastLoggedIn?: string | number;
    loggedInUsers?: string[];
  };
  
  // Asset management
  asset?: {
    purchaseDate?: string | number;
    warrantyExpiry?: string | number;
    assignedTo?: string;
    department?: string;
    location?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };
  
  // Mobile device specific
  mobile?: {
    phoneNumber?: string;
    imei?: string;
    iccid?: string;
    batteryLevel?: number;
    isSupervised?: boolean;
    isJailbroken?: boolean;
    installedApps?: string[];
    mdmEnrollmentStatus?: string;
  };
  
  // Management information
  management?: {
    group?: string;
    site?: string;
    policies?: string[];
    agentVersion?: string;
    wakeStatus?: string;
    lastCheckin?: string | number;
  };
}
```

### 2. Module-Specific Extended Interfaces

The model includes module-specific interfaces that describe the structure of data from each module:

- `RMMExtendedDevice`: For Tactical RMM-specific properties
- `MDMExtendedDevice`: For Fleet MDM-specific properties
- `RACExtendedDevice`: For MeshCentral-specific properties

### 3. Enhanced Adapter Functions

The adapter functions have been updated to extract more information from module-specific data:

- `fromRMMDevice()`: Maps RMM device data to the enhanced model
- `fromMDMDevice()`: Maps MDM device data to the enhanced model
- `fromRACDevice()`: Maps RAC device data to the enhanced model

### 4. Utility Functions

New utility functions have been added to work with the enhanced model:

- `formatDiskUsage()`: Format disk usage in a user-friendly way
- `getMemoryUsagePercentage()`: Calculate memory usage percentage
- `formatCpuInfo()`: Format CPU information
- `formatCpuUsage()`: Format CPU usage as a percentage
- `formatOsInfo()`: Format OS information
- `formatLocation()`: Format device location
- `formatLastBoot()`: Format device last boot time
- `getSecuritySummary()`: Get security status summary
- `getNetworkInterfaces()`: Get a list of network interfaces
- `getMobileDeviceInfo()`: Get mobile device-specific information

## Usage Examples

### Converting Devices to the Enhanced Model

```typescript
import { fromRMMDevice } from '@/utils/deviceAdapters';
import type { EnhancedUnifiedDevice } from '@/types/device';

// Convert a single device to the enhanced model
const enhancedDevice = fromRMMDevice(rmmDevice);

// Access enhanced properties
console.log(enhancedDevice.hardware?.cpu?.cores);
console.log(enhancedDevice.network?.publicIp);
```

### Using Utility Functions with the Enhanced Model

```typescript
import { 
  formatDiskUsage, 
  getMemoryUsagePercentage, 
  formatCpuInfo 
} from '@/utils/deviceUtils';
import type { EnhancedUnifiedDevice } from '@/types/device';

function displayDeviceDetails(device: EnhancedUnifiedDevice) {
  const diskUsage = formatDiskUsage(device);
  const memoryPercentage = getMemoryUsagePercentage(device);
  const cpuInfo = formatCpuInfo(device);
  
  console.log(`Disk Usage: ${diskUsage}`);
  console.log(`Memory Usage: ${memoryPercentage}%`);
  console.log(`CPU: ${cpuInfo}`);
}
```

### Type Guard for Enhanced Devices

```typescript
import { isEnhancedDevice } from '@/types/device';
import type { UnifiedDevice, EnhancedUnifiedDevice } from '@/types/device';

function processDevice(device: UnifiedDevice) {
  if (isEnhancedDevice(device)) {
    // Device has enhanced properties
    if (device.hardware?.storage) {
      // Work with storage information
    }
  } else {
    // Base unified device only
  }
}
```

## Module-Specific Properties

Each module has unique properties that are captured in both the enhanced model and the module-specific section.

### RMM Device Properties

- Hardware details (CPU, RAM, disk)
- Performance metrics (CPU load, memory usage)
- Operating system details
- Antivirus status

### MDM Device Properties

- Mobile-specific properties (battery, supervision status)
- Disk encryption status
- Profiles and policies
- Hardware details for mobile devices

### RAC Device Properties

- Connection status
- Agent details
- Network interface information
- User session information

## Best Practices

1. **Maintain Backward Compatibility**: All code that expects the base `UnifiedDevice` interface should work with `EnhancedUnifiedDevice`

2. **Optional Properties**: All enhanced properties are optional, so always check for existence before accessing

   ```typescript
   // Good practice
   const cpuCores = device.hardware?.cpu?.cores || 'Unknown';
   
   // Avoid this
   const cpuCores = device.hardware.cpu.cores; // Might cause runtime error
   ```

3. **Use Type Guards**: Use the `isEnhancedDevice` type guard to check if a device has enhanced properties

4. **Use Utility Functions**: Use the provided utility functions to format and process enhanced properties

5. **Module-Specific Operations**: For operations that require module-specific data, continue using `getOriginalDevice`

   ```typescript
   import { getOriginalDevice } from '@/types/device';
   import type { RMMDevice } from '@/utils/deviceAdapters';
   
   const originalRmmDevice = getOriginalDevice<RMMDevice>(enhancedDevice);
   ```

## Future Enhancements

1. **Real-time Updates**: Add support for real-time updates of enhanced properties
2. **Extended Metrics**: Add support for performance trends and historical data
3. **Cross-Module Mapping**: Improve mapping between different modules for the same physical device
4. **Richer UI Components**: Create specialized UI components that leverage the enhanced model 