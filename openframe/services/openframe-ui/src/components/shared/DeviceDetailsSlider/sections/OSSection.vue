<template>
  <div class="os-section">
    <div class="info-card">
      <h4 class="section-title">Operating System Information</h4>
      <div v-if="hasOS" class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.os?.name">
          <span class="info-label">OS Name:</span>
          <span class="info-value">{{ device.os.name }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.os?.version">
          <span class="info-label">OS Version:</span>
          <span class="info-value">{{ device.os.version }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.os?.build">
          <span class="info-label">Build:</span>
          <span class="info-value">{{ device.os.build }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.os?.architecture">
          <span class="info-label">Architecture:</span>
          <span class="info-value">{{ device.os.architecture }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.os?.lastBoot">
          <span class="info-label">Last Boot:</span>
          <span class="info-value">{{ formatTimestamp(device.os.lastBoot) }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.os?.uptime !== undefined">
          <span class="info-label">Uptime:</span>
          <span class="info-value">{{ formatUptime(device.os.uptime) }}</span>
        </div>
      </div>

      <!-- No OS Data Message -->
      <div v-if="!hasOS" class="p-4 text-center no-data">
        <i class="pi pi-desktop text-5xl mb-3" style="color: var(--blue-500)"></i>
        <h4>No OS Data</h4>
        <p class="text-color-secondary">No operating system information is available for this device.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from '@vue/runtime-core';
import { UnifiedDevice } from '../../../../types/device';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const hasOS = computed(() => {
  return props.device.os && (
    props.device.os.name ||
    props.device.os.version ||
    props.device.os.build ||
    props.device.os.architecture ||
    props.device.os.lastBoot ||
    props.device.os.uptime !== undefined
  );
});

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

const formatUptime = (seconds: number) => {
  if (!seconds) return 'Unknown';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0 || days > 0) result += `${hours}h `;
  result += `${minutes}m`;

  return result;
};
</script>

<style scoped>
.os-section {
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
</style> 