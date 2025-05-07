# Device Details Slider Implementation

Implementation of a sliding panel from the right side of the screen to display comprehensive device information in all device views, following the same pattern as existing sliders like ScriptExecutionHistory.vue.

## Completed Tasks

- [x] Analyze current device data structure
- [x] Review provided sample responses from different module types (MDM, RMM, RAC)
- [x] Examine existing ScriptExecutionHistory.vue component for design patterns and reuse
- [x] Review UnifiedDeviceTable.vue for device conversion patterns using deviceAdapters.ts

## In Progress Tasks

- [ ] Create a reusable DeviceDetailsSlider component using the sidebar pattern with mask
- [ ] Implement device type conversion logic using deviceAdapters.ts identical to UnifiedDeviceTable.vue
- [ ] Structure component with consistent header, content sections, and styling
- [ ] Expand the UnifiedDevice interface to include additional fields from sample responses
- [ ] Update deviceAdapters.ts to properly map extended fields

## Future Tasks

- [ ] Add device actions to the details slider (similar to existing action buttons)
- [ ] Implement conditional rendering based on device type
- [ ] Add tabs for organizing different categories of device information
- [ ] Add data visualization for system metrics (CPU, memory, disk usage)
- [ ] Implement real-time data updates for online devices
- [ ] Ensure responsive design matches existing components

## Implementation Plan

Create a sliding panel that appears from the right side when a device is selected. The panel will display comprehensive information about the selected device, organized into logical sections. Follow the same design patterns and component structure as the ScriptExecutionHistory.vue:

1. Use sidebar with mask overlay pattern
2. Create a clean header with title and action buttons
3. Organize content with consistent spacing and styling
4. Use PrimeVue components with custom styling
5. Implement smooth transitions for panel appearance
6. Structure device information in collapsible sections
7. **Use deviceAdapters.ts for consistent device conversion across all views**

### Component Structure

```vue
<template>
  <div class="device-details-slider">
    <!-- Mask overlay -->
    <div v-if="visible" class="sidebar-mask active" @click="onVisibilityChange(false)"></div>
    
    <!-- Sidebar panel -->
    <div class="sidebar" :class="{ 'active': visible }">
      <!-- Header -->
      <div class="sidebar-header">
        <h3 class="text-xl m-0">Device Details</h3>
        <div class="flex gap-2">
          <!-- Action buttons -->
          <OFButton icon="pi pi-times" class="p-button-text p-button-rounded" @click="onVisibilityChange(false)" aria-label="Close" />
        </div>
      </div>

      <!-- Content -->
      <div class="sidebar-content">
        <!-- Device information sections, using unifiedDevice for display -->
        <div v-if="unifiedDevice" class="device-info">
          <!-- Sections will display unifiedDevice properties -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from '@vue/runtime-core';
import { OFButton } from '../../components/ui';
import { UnifiedDevice, DeviceModuleType } from '../../types/device';
// Direct reuse of the same adapters from UnifiedDeviceTable
import { convertDevices, autoConvertDevices } from '../../utils/deviceAdapters';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  device: {
    type: Object,
    required: true
  },
  moduleType: {
    type: String as () => DeviceModuleType,
    validator: (value: string) => ['rmm', 'mdm', 'rac'].includes(value),
    default: ''
  }
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const onVisibilityChange = (value: boolean) => {
  emit('update:visible', value);
};

// Convert the device to a unified model using the same pattern as UnifiedDeviceTable.vue
const unifiedDevice = computed<UnifiedDevice>(() => {
  if (!props.device) return null;
  
  // Check if the device is already in UnifiedDevice format
  if ('type' in props.device && 'moduleSpecific' in props.device) {
    return props.device as UnifiedDevice;
  }
  
  // Direct reference to the conversion pattern in UnifiedDeviceTable.vue
  if (props.moduleType) {
    const converted = convertDevices([props.device], props.moduleType);
    return converted.length > 0 ? converted[0] : null;
  }
  
  // Try auto-detection if moduleType is not provided
  const converted = autoConvertDevices([props.device]);
  return converted.length > 0 ? converted[0] : null;
});
</script>
```

### Usage Example

```vue
<!-- In MDM/RMM/RAC device views -->
<template>
  <DeviceDetailsSlider
    v-model:visible="showDetailsSlider"
    :device="selectedDevice"
    :moduleType="'mdm'" <!-- or 'rmm' or 'rac' depending on the view -->
  />
</template>

<script setup>
import { ref } from 'vue';
import DeviceDetailsSlider from '../../components/devices/DeviceDetailsSlider.vue';

const showDetailsSlider = ref(false);
const selectedDevice = ref(null);

const viewDeviceDetails = (device) => {
  selectedDevice.value = device;
  showDetailsSlider.value = true;
};
</script>
```

### Device Information Sections

The slider will display information organized in logical sections, all derived from the converted UnifiedDevice:

1. **Device Overview**
   - Hostname, Display Name, Platform, OS Version, Status
   - Icon and visual indicators for device type and status

2. **System Information**
   - Hardware details (CPU, RAM, Storage, Model, Serial Number)
   - Operating system details
   - Uptime and boot time

3. **Network Information**
   - IP Addresses (IPv4, IPv6)
   - MAC Addresses
   - Network interfaces

4. **Security Information**
   - Encryption status
   - Antivirus details
   - Vulnerability information

5. **Management Information**
   - Enrollment status (MDM)
   - Agent version (RMM)
   - Management server details

6. **Module-specific Details**
   - Show additional data based on the device type (MDM, RMM, RAC)
   - Custom fields for each module

7. **Available Actions**
   - Context-aware action buttons based on device type

### Relevant Files

- openframe/services/openframe-ui/src/components/devices/DeviceDetailsSlider.vue - New component for device details using the same pattern as ScriptExecutionHistory.vue
- openframe/services/openframe-ui/src/types/device.ts - Update UnifiedDevice interface to include additional fields
- openframe/services/openframe-ui/src/utils/deviceAdapters.ts - Update adapter functions to map all available fields
- openframe/services/openframe-ui/src/views/mdm/Devices.vue - Update to use the slider
- openframe/services/openframe-ui/src/views/rmm/Devices.vue - Update to use the slider
- openframe/services/openframe-ui/src/views/rac/Devices.vue - Update to use the slider 

### Styling Approach

Maintain consistent styling with other components:
- Use CSS variables for theming (--surface-section, --text-color, etc.)
- Match transition animations and timings
- Ensure responsive behavior for different screen sizes
- Use consistent spacing and borders
- Follow the same tag and status indicator styling as UnifiedDeviceTable 