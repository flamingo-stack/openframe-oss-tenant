<template>
  <div class="hardware-section">
    <!-- CPU Information -->
    <div class="info-card mb-3" v-if="device.hardware?.cpu">
      <h4 class="section-title">CPU Information</h4>
      <div class="grid">
        <div class="col-12 info-row" v-if="device.hardware.cpu.model">
          <span class="info-label">CPU Model:</span>
          <span class="info-value">{{ device.hardware.cpu.model }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware.cpu.cores !== undefined">
          <span class="info-label">Physical Cores:</span>
          <span class="info-value">{{ device.hardware.cpu.cores }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware.cpu.logicalCores !== undefined">
          <span class="info-label">Logical Cores:</span>
          <span class="info-value">{{ device.hardware.cpu.logicalCores }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware.cpu.usage !== undefined">
          <span class="info-label">CPU Usage:</span>
          <div class="w-full">
            <ProgressBar :value="device.hardware.cpu.usage" :showValue="true" />
          </div>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware.cpu.architecture">
          <span class="info-label">CPU Architecture:</span>
          <span class="info-value">{{ device.hardware.cpu.architecture }}</span>
        </div>
      </div>
    </div>

    <!-- Memory Information -->
    <div class="info-card mb-3" v-if="device.hardware?.memory">
      <h4 class="section-title">Memory</h4>
      <div v-if="device.hardware.memory.total && device.hardware.memory.used" class="mb-3">
        <ProgressBar :value="getMemoryPercentage()" />
        <div class="usage-label">
          {{ formatBytes(device.hardware.memory.used) }} of {{ formatBytes(device.hardware.memory.total) }} used
          ({{ getMemoryPercentage().toFixed(1) }}%)
        </div>
      </div>
      <div class="grid">
        <div class="col-12 md:col-4 info-row" v-if="device.hardware.memory.total">
          <span class="info-label">Total Memory:</span>
          <span class="info-value">{{ formatBytes(device.hardware.memory.total) }}</span>
        </div>
        <div class="col-12 md:col-4 info-row" v-if="device.hardware.memory.used">
          <span class="info-label">Used Memory:</span>
          <span class="info-value">{{ formatBytes(device.hardware.memory.used) }}</span>
        </div>
        <div class="col-12 md:col-4 info-row" v-if="device.hardware.memory.free">
          <span class="info-label">Free Memory:</span>
          <span class="info-value">{{ formatBytes(device.hardware.memory.free) }}</span>
        </div>
      </div>
    </div>

    <!-- Storage Information -->
    <div class="info-card mb-3" v-if="hasStorage">
      <h4 class="section-title">Storage</h4>
      <div class="storage-cards">
        <div v-for="(disk, index) in device.hardware.storage" :key="index" class="storage-card mb-3 p-3">
          <div class="disk-name mb-2">{{ disk.name || `Disk ${index + 1}` }}</div>
          <div v-if="disk.total && disk.used" class="mb-2">
            <ProgressBar :value="calculateDiskUsage(disk)" />
            <div class="usage-label">
              {{ formatBytes(disk.used) }} of {{ formatBytes(disk.total) }} used
              ({{ calculateDiskUsage(disk).toFixed(1) }}%)
            </div>
          </div>
          <div class="grid">
            <div class="col-4 info-row">
              <span class="info-label">Total:</span>
              <span class="info-value">{{ formatBytes(disk.total) }}</span>
            </div>
            <div class="col-4 info-row">
              <span class="info-label">Used:</span>
              <span class="info-value">{{ formatBytes(disk.used) }}</span>
            </div>
            <div class="col-4 info-row">
              <span class="info-label">Free:</span>
              <span class="info-value">{{ formatBytes(disk.free) }}</span>
            </div>
          </div>
          <div v-if="disk.mountPoint" class="mt-2">
            <span class="info-label">Mount Point:</span>
            <span class="info-value">{{ disk.mountPoint }}</span>
          </div>
          <div v-if="disk.type" class="mt-1">
            <span class="info-label">Type:</span>
            <span class="info-value">{{ disk.type }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- GPU Information -->
    <div class="info-card" v-if="hasGPU">
      <h4 class="section-title">Graphics</h4>
      <div v-for="(gpu, index) in device.hardware.gpu" :key="index" class="gpu-info mb-2">
        <div class="info-value">{{ gpu }}</div>
      </div>
    </div>

    <!-- Hardware Hardware Information -->
    <div class="info-card mb-3" v-if="hasHardwareInfo">
      <h4 class="section-title">Hardware Details</h4>
      <div class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.hardware?.manufacturer">
          <span class="info-label">Manufacturer:</span>
          <span class="info-value">{{ device.hardware.manufacturer }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware?.model">
          <span class="info-label">Model:</span>
          <span class="info-value">{{ device.hardware.model }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.hardware?.serialNumber">
          <span class="info-label">Serial Number:</span>
          <span class="info-value">{{ device.hardware.serialNumber }}</span>
        </div>
      </div>
    </div>

    <!-- No Hardware Data Message -->
    <div v-if="!hasHardwareData" class="p-4 text-center no-data">
      <i class="pi pi-server text-5xl mb-3" style="color: var(--blue-500)"></i>
      <h4>No Hardware Data</h4>
      <p class="text-color-secondary">No hardware information is available for this device.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from '@vue/runtime-core';
import ProgressBar from 'primevue/progressbar';
import { UnifiedDevice } from '../../../../types/device';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const hasStorage = computed(() => {
  return props.device.hardware?.storage && props.device.hardware.storage.length > 0;
});

const hasGPU = computed(() => {
  return props.device.hardware?.gpu && props.device.hardware.gpu.length > 0;
});

const hasHardwareInfo = computed(() => {
  const hw = props.device.hardware;
  return hw && (hw.manufacturer || hw.model || hw.serialNumber);
});

const hasHardwareData = computed(() => {
  return props.device.hardware && (
    props.device.hardware.cpu || 
    props.device.hardware.memory ||
    hasStorage.value ||
    hasGPU.value ||
    hasHardwareInfo.value
  );
});

const getMemoryPercentage = () => {
  if (!props.device.hardware?.memory?.total || !props.device.hardware?.memory?.used) {
    return 0;
  }
  return (props.device.hardware.memory.used / props.device.hardware.memory.total) * 100;
};

const calculateDiskUsage = (disk: any) => {
  if (!disk.total || !disk.used) {
    return 0;
  }
  return (disk.used / disk.total) * 100;
};

const formatBytes = (bytes: number | undefined) => {
  if (bytes === undefined) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(2)} ${units[i]}`;
};
</script>

<style scoped>
.hardware-section {
  margin-bottom: 1.5rem;
}

.info-card {
  background-color: var(--surface-card);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.1);
}

.no-data {
  background-color: var(--surface-card);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.1);
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
}

.storage-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.storage-card {
  background-color: var(--surface-ground);
  border-radius: 4px;
  width: 100%;
}

@media screen and (min-width: 768px) {
  .storage-card {
    width: calc(50% - 0.5rem);
  }
}

.disk-name {
  font-weight: 600;
  color: var(--text-color);
  font-size: 1rem;
}

.usage-label {
  display: flex;
  justify-content: flex-end;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
}

:deep(.p-progressbar) {
  height: 0.5rem !important;
}
</style> 