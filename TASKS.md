# Unified Device Model Implementation

This task list outlines the plan for creating a unified device model that works across Remote Monitoring and Management (RMM), Mobile Device Management (MDM), and Remote Access Control (RAC) modules.

## Completed Tasks

- [x] Initial analysis of existing device models across modules
- [x] Define common device interface/type
  - [x] Define core properties that exist across all modules
  - [x] Define optional properties that might exist in some modules
  - [x] Create TypeScript interfaces with appropriate typing
- [x] Create unified device model utility functions
  - [x] Standardize platform detection and formatting
  - [x] Create unified status handling methods
  - [x] Implement common utility functions for device operations
- [x] Create adapter functions to transform module-specific data to unified model
  - [x] Create RMM data adapter
  - [x] Create MDM data adapter
  - [x] Create RAC data adapter
  - [x] Implement bidirectional conversion where needed
- [x] Create common UI components for device display
  - [x] Create unified device table component
- [x] Implement unified device model in RMM module
  - [x] Update API response handling to use adapters
  - [x] Maintain backward compatibility with existing code
  - [x] Test with actual API data
- [x] Implement unified device model in MDM module
  - [x] Update API response handling to use adapters
  - [x] Maintain backward compatibility with existing code
  - [x] Test with actual API data
- [x] Implement unified device model in RAC module
  - [x] Update API response handling to use adapters
  - [x] Maintain backward compatibility with existing code
  - [x] Test with actual API data
- [x] Write documentation for the unified device model
  - [x] Create technical documentation for developers
  - [x] Add code comments for maintainability
- [x] Enhance device adapter mapping
  - [x] Fix MDM device adapter to correctly map status fields
  - [x] Improve MDM adapter with comprehensive property mapping
  - [x] Update interface to support all fields from Fleet API response

## In Progress Tasks

- [ ] Update device component imports to use unified model
  - [x] Update UnifiedDeviceTable usage
  - [ ] Update CommandDialog usage
  - [x] Update DeviceDetailsDialog usage

## Future Tasks

- [ ] Create common UI components for device display
  - [ ] Create unified device card component
  - [ ] Create unified device action buttons
- [ ] Write tests for the unified device model and adapters
  - [ ] Unit tests for adapter functions
  - [ ] Integration tests with mock API data
- [ ] Implement additional enhancements to unified device model
  - [ ] Add battery information display for mobile devices
  - [ ] Add disk encryption status reporting
  - [ ] Create specialized views for different device types

## Implementation Plan

### Common Device Interface

We have successfully created a unified device model that accommodates the different properties across the three modules while providing a consistent interface for UI components.

1. Created a common device interface with core properties:
   - id: Unique identifier (different across systems)
   - hostname/name: Device name
   - platform: Operating system platform (windows, darwin, linux, ios, android)
   - osVersion: Operating system version
   - status: Connection/online status (online, offline, unknown)
   - lastSeen: Last connection timestamp
   - type: Device type indicator (RMM, MDM, RAC)
   - moduleSpecific: Module-specific data preserved for specialized operations

2. Created adapter functions to transform module-specific data to the unified model:
   - RMM adapter: Maps from tactical-rmm API response
   - MDM adapter: Maps from fleet API response
   - RAC adapter: Maps from meshcentral API response

3. Updated all module views to use this common interface:
   - RMM devices view now uses the unified model
   - MDM devices view now uses the unified model
   - RAC devices view now uses the unified model

### Device Utilities

1. Standardized common device operations:
   - Platform detection and formatting
   - Status handling and display
   - Icon selection
   - Timestamp formatting

2. Created helper functions for common device operations:
   - Type guards for device types
   - Helper for accessing original module-specific data

### Implemented UI Components

1. Created UnifiedDeviceTable component that works with the unified model across all modules

### Recent Improvements

1. **Enhanced MDM Device Adapter**:
   - Fixed status mapping to use direct `status` field from Fleet API
   - Added comprehensive property mapping for Fleet MDM devices
   - Improved handling of network, hardware, and OS information
   - Added proper display name and IP address mapping
   - Added support for device last seen time using `seen_time` field

2. **Updated DeviceDetailsDialog**:
   - Better display of MDM device information
   - Improved property organization and presentation

### Next Steps

1. Continue updating UI components to fully leverage the enhanced unified model
2. Create additional shared UI components
3. Write tests for the adapter functions 

## Implementation Summary

We have successfully implemented a unified device model that works across all three modules (RMM, MDM, and RAC) with these key components:

1. **Core Device Interface**: Created a standardized `UnifiedDevice` interface in `src/types/device.ts`

2. **Adapter Functions**: Implemented module-specific adapters in `src/utils/deviceAdapters.ts`:
   - fromRMMDevice: Converts Tactical RMM devices
   - fromMDMDevice: Converts Fleet MDM devices
   - fromRACDevice: Converts MeshCentral devices

3. **Utility Functions**: Created various utility functions in `src/utils/deviceUtils.ts`

4. **UI Components**: Implemented `UnifiedDeviceTable.vue` that works with all device types

5. **Module Integration**: Updated all three device view components:
   - RMM Devices view
   - MDM Devices view
   - RAC Devices view

6. **Documentation**: Created comprehensive documentation in `docs/unified-device-model.md`

This implementation provides a solid foundation for further improvements and will make it easier to maintain and extend the device management functionality across OpenFrame.

## Enhanced Unified Device Model Plan

### Goals
- Create a more comprehensive unified device model that includes all possible properties from RMM, MDM, and RAC modules
- Update adapter functions to map all available properties from source modules
- Maintain backward compatibility with existing code
- Improve type safety and reduce the need for accessing moduleSpecific data

### Detailed Implementation Plan

1. **Extend the UnifiedDevice interface with comprehensive properties**:

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

2. **Create specialized extended interfaces for each module**:

   ```typescript
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
   ```

3. **Update adapter functions to map all available properties**:

   ```typescript
   export function fromRMMDevice(device: RMMDevice): EnhancedUnifiedDevice {
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
       
       // Enhanced properties
       hardware: {
         model: device.hardware_info?.motherboard || undefined,
         serialNumber: device.hardware_info?.serial_number || undefined,
         cpu: {
           model: device.hardware_info?.cpu || undefined,
           cores: device.cpu_cores || undefined,
           usage: device.cpu_load || undefined,
         },
         memory: {
           total: device.total_ram || undefined,
           used: device.used_ram || undefined,
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
         publicIp: device.public_ip || undefined,
       },
       
       os: {
         name: device.operating_system?.split(' ')[0] || undefined,
         version: device.operating_system || undefined,
       },
       
       management: {
         site: device.site_name || undefined,
         group: device.client_name || undefined,
       },
       
       // Preserve the original data
       moduleSpecific: device,
     };
   }
   
   // Similar enhancements for fromMDMDevice and fromRACDevice functions
   ```

4. **Update utility functions to support the enhanced model**:

   ```typescript
   // Format disk usage in a user-friendly way
   export function formatDiskUsage(device: EnhancedUnifiedDevice): string {
     if (!device.hardware?.storage || device.hardware.storage.length === 0) {
       return 'N/A';
     }
     
     const mainDisk = device.hardware.storage[0];
     return `${formatBytes(mainDisk.used || 0)} / ${formatBytes(mainDisk.total || 0)}`;
   }
   
   // Get memory usage as a percentage
   export function getMemoryUsagePercentage(device: EnhancedUnifiedDevice): number {
     const total = device.hardware?.memory?.total;
     const used = device.hardware?.memory?.used;
     
     if (!total || !used || total === 0) {
       return 0;
     }
     
     return (used / total) * 100;
   }
   
   // Additional utility functions
   ```

5. **Type guards for the enhanced model**:

   ```typescript
   export function isEnhancedDevice(device: UnifiedDevice): device is EnhancedUnifiedDevice {
     return (device as EnhancedUnifiedDevice).hardware !== undefined ||
            (device as EnhancedUnifiedDevice).network !== undefined ||
            (device as EnhancedUnifiedDevice).os !== undefined;
   }
   ```

### Current Status
- [x] Phase 1: Extended UnifiedDevice interface and updated adapter functions
- [x] Phase 2: Created specialized extended interfaces and updated utility functions
- [x] Phase 3: Added documentation and examples
- [ ] Phase 4: Testing and validation

### Compatibility Considerations
- All existing code using the UnifiedDevice interface will continue to work
- New components can gradually adopt the enhanced model
- Module-specific views can be updated to use the enhanced properties as needed 