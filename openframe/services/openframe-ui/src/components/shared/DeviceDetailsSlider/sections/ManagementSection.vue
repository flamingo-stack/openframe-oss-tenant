<template>
  <div class="management-section">
    <div class="info-card">
      <h4 class="section-title">Management Information</h4>
      <div v-if="hasManagementData" class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.management?.site">
          <span class="info-label">Site:</span>
          <span class="info-value">{{ device.management.site }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.management?.group">
          <span class="info-label">Group:</span>
          <span class="info-value">{{ device.management.group }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.management?.agentVersion">
          <span class="info-label">Agent Version:</span>
          <span class="info-value">{{ device.management.agentVersion }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.management?.lastCheckin">
          <span class="info-label">Last Check-in:</span>
          <span class="info-value">{{ formatTimestamp(device.management.lastCheckin) }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.type">
          <span class="info-label">Management Module:</span>
          <Tag severity="info">{{ getModuleDisplayName(device.type) }}</Tag>
        </div>
      </div>
      
      <!-- Module Specific Information -->
      <div v-if="hasModuleSpecific" class="mt-3">
        <h5 class="module-title">Module-Specific Information</h5>
        <div class="module-info p-3">
          <div v-for="item in getModuleSpecificItems()" :key="item.key" class="info-row">
            <span class="info-label">{{ item.label }}:</span>
            <span class="info-value">{{ item.displayValue }}</span>
          </div>
        </div>
      </div>

      <!-- No Management Data Message -->
      <div v-if="!hasManagementData && !hasModuleSpecific" class="p-4 text-center no-data">
        <i class="pi pi-cog text-5xl mb-3" style="color: var(--blue-500)"></i>
        <h4>No Management Data</h4>
        <p class="text-color-secondary">No management information is available for this device.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from '@vue/runtime-core';
import Tag from 'primevue/tag';
import { UnifiedDevice } from '../../../../types/device';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const hasManagementData = computed(() => {
  return props.device.management && (
    props.device.management.site ||
    props.device.management.group ||
    props.device.management.agentVersion ||
    props.device.management.lastCheckin
  );
});

const hasModuleSpecific = computed(() => {
  return props.device.moduleSpecific && Object.keys(props.device.moduleSpecific).length > 0;
});

const moduleSpecificData = computed(() => {
  if (!props.device.moduleSpecific) return {};
  
  // Get the module-specific data for the current device type
  const moduleType = props.device.type;
  return props.device.moduleSpecific[moduleType as keyof typeof props.device.moduleSpecific] || {};
});

const getModuleDisplayName = (moduleType: string): string => {
  const moduleNames: Record<string, string> = {
    'rmm': 'Remote Monitoring & Management',
    'mdm': 'Mobile Device Management',
    'rac': 'Remote Access & Control'
  };
  
  return moduleNames[moduleType] || moduleType.toUpperCase();
};

const shouldDisplayProperty = (key: string, propValue: any): boolean => {
  // Skip properties that we don't want to display
  const skipProperties = ['agent_id', 'id', 'hostname', 'device_id'];
  if (skipProperties.includes(key)) return false;
  
  // Skip null, undefined, empty strings, and empty arrays/objects
  if (propValue === null || propValue === undefined) return false;
  if (propValue === '') return false;
  if (Array.isArray(propValue) && propValue.length === 0) return false;
  if (typeof propValue === 'object' && Object.keys(propValue).length === 0) return false;
  
  return true;
};

const formatPropertyName = (name: string): string => {
  // Convert snake_case or camelCase to Title Case with spaces
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatPropertyValue = (propValue: any): string => {
  if (propValue === null || propValue === undefined) return 'N/A';
  
  if (typeof propValue === 'boolean') {
    return propValue ? 'Yes' : 'No';
  }
  
  if (typeof propValue === 'object') {
    return JSON.stringify(propValue, null, 2);
  }
  
  return String(propValue);
};

const formatTimestamp = (timestamp: string | number | undefined) => {
  if (!timestamp) return 'Unknown';

  try {
    const date = typeof timestamp === 'number'
      ? new Date(timestamp)
      : new Date(timestamp);

    return date.toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const getModuleSpecificItems = () => {
  const items: { key: string; label: string; displayValue: string }[] = [];
  
  for (const key in moduleSpecificData.value) {
    if (shouldDisplayProperty(key, moduleSpecificData.value[key])) {
      items.push({
        key,
        label: formatPropertyName(key),
        displayValue: formatPropertyValue(moduleSpecificData.value[key])
      });
    }
  }
  
  return items;
};
</script>

<style scoped>
.management-section {
  margin-bottom: 1.5rem;
}

.info-card {
  background-color: var(--surface-card);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.1);
}

.no-data {
  background-color: var(--surface-ground);
  border-radius: 4px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-color);
  font-weight: 600;
  font-size: 1.1rem;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.module-title {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--text-color-secondary);
  font-weight: 600;
  font-size: 1rem;
}

.module-info {
  background-color: var(--surface-ground);
  border-radius: 4px;
}

.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
}

.info-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.info-value {
  color: var(--text-color);
  word-break: break-word;
}

:deep(.p-tag) {
  display: inline-flex;
  width: fit-content;
  min-width: 0;
  padding: 0.15rem 0.4rem;
}
</style> 