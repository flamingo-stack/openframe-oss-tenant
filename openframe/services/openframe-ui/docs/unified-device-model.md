# Unified Device Model Documentation

This document describes the unified device model implemented across RMM, MDM, and RAC modules in OpenFrame.

## Overview

The unified device model provides a consistent interface for working with devices across different management systems, including:

- Remote Monitoring and Management (RMM) - Tactical RMM
- Mobile Device Management (MDM) - Fleet
- Remote Access Control (RAC) - MeshCentral

By standardizing device properties and behaviors, this model simplifies development and ensures consistent user experiences across different modules.

## Core Components

The unified device model consists of several core components:

### 1. Type Definitions

Located in `src/types/device.ts`:

```typescript
export type DevicePlatform = 'windows' | 'darwin' | 'linux' | 'ios' | 'android' | 'unknown';
export type DeviceStatus = 'online' | 'offline' | 'pending' | 'overdue' | 'unknown';
export type DeviceModuleType = 'rmm' | 'mdm' | 'rac';

export interface UnifiedDevice {
  // Core identifying information
  id: string;                   
  hostname: string;             
  displayName?: string;         
  
  // System information
  platform: DevicePlatform;     
  osVersion: string;            
  
  // Status information
  status: DeviceStatus;         
  lastSeen: string | number;    
  
  // Metadata
  type: DeviceModuleType;       
  icon?: string;                
  
  // Network information
  ipAddresses?: string[];       
  
  // Module-specific data preserved for specialized operations
  moduleSpecific: any;          
}
```

### 2. Adapter Functions

Located in `src/utils/deviceAdapters.ts`:

The adapter functions convert module-specific device data to the unified model:

- `fromRMMDevice()`: Converts Tactical RMM devices
- `fromMDMDevice()`: Converts Fleet MDM devices
- `fromRACDevice()`: Converts MeshCentral devices

Additionally, utility functions are provided:
- `convertDevices()`: Converts an array of devices from a specific module
- `autoConvertDevices()`: Automatically detects device type and converts

### 3. Utility Functions

Located in `src/utils/deviceUtils.ts`:

- Platform detection and formatting
- Status handling and mapping
- Icon selection
- Timestamp formatting
- Helper functions for common operations

### 4. UI Components

- `UnifiedDeviceTable.vue`: A reusable table component that displays devices from any module

## Usage Examples

### Converting Devices

```typescript
import { fromRMMDevice } from '@/utils/deviceAdapters';

// Convert a single device
const unifiedDevice = fromRMMDevice(rmmDevice);

// Convert an array of devices
import { convertDevices } from '@/utils/deviceAdapters';
const unifiedDevices = convertDevices(rmmDevices, 'rmm');

// Auto-detect and convert devices
import { autoConvertDevices } from '@/utils/deviceAdapters';
const unifiedDevices = autoConvertDevices(devices);
```

### Accessing Original Device Properties

```typescript
import { UnifiedDevice, getOriginalDevice } from '@/types/device';
import { RMMDevice } from '@/utils/deviceAdapters';

function performAction(device: UnifiedDevice) {
  // Access the original device data
  const originalDevice = getOriginalDevice<RMMDevice>(device);
  
  // Use original device properties for module-specific operations
  const agentId = originalDevice.agent_id;
}
```

### Using the UnifiedDeviceTable Component

```vue
<template>
  <UnifiedDeviceTable
    :devices="devices"
    moduleType="rmm"
    :loading="loading"
    @runCommand="handleRunCommand"
    @viewDetails="handleViewDetails"
    @deleteDevice="handleDeleteDevice"
  />
</template>

<script setup>
import { ref } from 'vue';
import UnifiedDeviceTable from '@/components/shared/UnifiedDeviceTable.vue';
import { UnifiedDevice } from '@/types/device';

const devices = ref([]);
const loading = ref(false);

const handleRunCommand = (device: UnifiedDevice) => {
  // Handle run command
};

const handleViewDetails = (device: UnifiedDevice) => {
  // Handle view details
};

const handleDeleteDevice = (device: UnifiedDevice) => {
  // Handle delete device
};
</script>
```

## Type Guards

The model includes type guards to help with type checking:

```typescript
import { isRMMDevice, isMDMDevice, isRACDevice } from '@/types/device';

function handleDevice(device: UnifiedDevice) {
  if (isRMMDevice(device)) {
    // RMM-specific logic
  } else if (isMDMDevice(device)) {
    // MDM-specific logic
  } else if (isRACDevice(device)) {
    // RAC-specific logic
  }
}
```

## Best Practices

1. Always use the unified model in UI components for consistency
2. Use type guards and getOriginalDevice when you need module-specific functionality
3. When working with API responses, convert to the unified model as early as possible
4. Extend the unified model with new fields as needed, but maintain backward compatibility

## Future Enhancements

1. Additional shared UI components (device cards, status indicators)
2. Better typing for module-specific properties
3. Extended test coverage
4. Performance optimizations for large device sets 