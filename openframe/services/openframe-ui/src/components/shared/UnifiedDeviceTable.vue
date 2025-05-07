<template>
  <ModuleTable 
    :items="unifiedDevices" 
    :loading="loading"
    :searchFields="['hostname', 'platform', 'osVersion', 'status']" 
    emptyIcon="pi pi-desktop"
    :emptyTitle="emptyTitle" 
    :emptyMessage="emptyMessage"
    :emptyHint="emptyHint"
    v-bind="$attrs"
  >
    <Column field="hostname" header="Hostname" sortable>
      <template #body="{ data }">
        <div class="flex align-items-center">
          <i :class="data.icon || 'pi pi-desktop'" class="mr-2"></i>
          <span>{{ data.displayName || data.hostname }}</span>
        </div>
      </template>
    </Column>

    <Column field="platform" header="Platform" sortable>
      <template #body="{ data }">
        <Tag :value="formatPlatform(data.platform)" :severity="getPlatformSeverity(data.platform)" />
      </template>
    </Column>

    <Column field="osVersion" header="OS Version" sortable>
      <template #body="{ data }">
        <span class="text-sm">{{ data.osVersion || 'Unknown' }}</span>
      </template>
    </Column>

    <Column field="status" header="Status" sortable>
      <template #body="{ data }">
        <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
      </template>
    </Column>

    <Column field="lastSeen" header="Last Seen" sortable>
      <template #body="{ data }">
        <span class="text-sm">{{ formatTimestamp(data.lastSeen) }}</span>
      </template>
    </Column>
    
    <!-- MDM Status Column - Only show for MDM devices -->
    <Column v-if="props.moduleType === 'mdm'" field="moduleSpecific.mdm.enrollment_status" header="MDM Status" sortable>
      <template #body="{ data }">
        <Tag :value="data.moduleSpecific?.mdm?.enrollment_status || 'Not enrolled'"
          :severity="getMDMStatusSeverity(data.moduleSpecific?.mdm?.enrollment_status)" />
      </template>
    </Column>

    <Column header="Actions" :exportable="false">
      <template #body="{ data }">
        <slot name="actions" :device="data">
          <div class="flex gap-2 justify-content-center">
            <OFButton 
              v-if="isCommandAvailable(data)" 
              icon="pi pi-code" 
              class="p-button-text p-button-sm" 
              v-tooltip.top="'Run Command'"
              @click="$emit('runCommand', data)" 
            />
            <OFButton 
              icon="pi pi-eye" 
              class="p-button-text p-button-sm" 
              v-tooltip.top="'View Details'"
              @click="$emit('viewDetails', data)" 
            />
            <OFButton 
              icon="pi pi-trash" 
              class="p-button-text p-button-sm p-button-danger"
              v-tooltip.top="'Delete Device'" 
              @click="$emit('deleteDevice', data)" 
            />
            <slot name="extraActions" :device="data"></slot>
          </div>
        </slot>
      </template>
    </Column>

    <slot></slot>
  </ModuleTable>
</template>

<script setup lang="ts">
import { computed, ref } from "@vue/runtime-core";
import { UnifiedDevice, DeviceModuleType } from '../../types/device';
import Column from 'primevue/column';
import { OFButton } from '../ui';
import Tag from 'primevue/tag';
import ModuleTable from './ModuleTable.vue';
import { 
  formatPlatform, 
  getPlatformSeverity, 
  getStatusSeverity, 
  formatTimestamp 
} from '../../utils/deviceUtils';
import { 
  autoConvertDevices,
  convertDevices
} from '../../utils/deviceAdapters';

const props = defineProps({
  devices: {
    type: Array,
    required: true,
  },
  moduleType: {
    type: String as () => DeviceModuleType,
    validator: (value: string) => ['rmm', 'mdm', 'rac'].includes(value),
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyTitle: {
    type: String,
    default: "No Devices Found"
  },
  emptyMessage: {
    type: String,
    default: "There are no devices available."
  },
  emptyHint: {
    type: String,
    default: "Devices will appear here once they are added."
  }
});

const emits = defineEmits([
  'runCommand', 
  'viewDetails', 
  'deleteDevice',
  'lockDevice',
  'update:devices'
]);

// Convert devices to unified model
const unifiedDevices = computed(() => {
  if (!props.devices || props.devices.length === 0) {
    return [];
  }

  if (props.moduleType) {
    return convertDevices(props.devices, props.moduleType);
  }

  return autoConvertDevices(props.devices);
});

// Function to determine if command feature is available for a device
const isCommandAvailable = (device: UnifiedDevice) => {
  return device.type === 'rmm' || device.type === 'rac';
};

// MDM status severity helper function
const getMDMStatusSeverity = (status: string | null | undefined) => {
  if (!status) return 'danger';
  if (status.toLowerCase().includes('on')) return 'success';
  if (status.toLowerCase().includes('pending')) return 'warning';
  return 'info';
};
</script>

<style scoped>
:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}
</style> 