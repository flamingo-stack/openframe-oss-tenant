<template>
  <div class="overview-section">
    <div class="info-card">
      <h4 class="section-title">Device Overview</h4>
      <div class="device-overview">
        <div class="grid">
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">Hostname:</span>
            <span class="info-value">{{ device.hostname }}</span>
          </div>
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">Status:</span>
            <Tag :severity="getStatusSeverity(device.status)">{{ device.status }}</Tag>
          </div>
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">Platform:</span>
            <Tag :severity="getPlatformSeverity(device.platform)">{{ formatPlatform(device.platform) }}</Tag>
          </div>
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">OS Version:</span>
            <span class="info-value">{{ device.osVersion }}</span>
          </div>
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">Last Seen:</span>
            <span class="info-value">{{ formatTimestamp(device.lastSeen) }}</span>
          </div>
          <div class="col-12 md:col-6 info-row">
            <span class="info-label">Device Type:</span>
            <Tag severity="info">{{ device.type.toUpperCase() }}</Tag>
          </div>
          <!-- MDM Specific -->
          <div class="col-12 md:col-6 info-row"
            v-if="device.type === 'mdm' && device.moduleSpecific?.mdm?.enrollment_status">
            <span class="info-label">MDM Status:</span>
            <Tag :severity="getMDMStatusSeverity(device.moduleSpecific.mdm.enrollment_status)">
              {{ device.moduleSpecific.mdm.enrollment_status }}
            </Tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from '@vue/runtime-core';
import Tag from 'primevue/tag';
import { UnifiedDevice } from '../../../../types/device';
import { formatPlatform, getPlatformSeverity } from '../../../../utils/deviceUtils';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const getStatusSeverity = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'online':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
      return 'warning';
    case 'offline':
      return 'danger';
    default:
      return 'info';
  }
};

const getMDMStatusSeverity = (status: string) => {
  if (!status) return 'danger';

  const statusLower = status.toLowerCase();
  if (statusLower === 'on' || statusLower.includes('active')) return 'success';
  if (statusLower === 'pending' || statusLower.includes('pending')) return 'warning';
  if (statusLower === 'off' || statusLower.includes('off')) return 'danger';

  return 'info';
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
</script>

<style scoped>
.overview-section {
  margin-bottom: 1.5rem;
}

.info-card {
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

/* Make tags more compact */
:deep(.p-tag) {
  display: inline-flex;
  width: fit-content;
  min-width: 0;
  padding: 0.15rem 0.4rem;
}
</style> 