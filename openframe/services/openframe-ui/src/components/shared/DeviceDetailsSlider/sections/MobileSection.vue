<template>
  <div class="mobile-section">
    <!-- Device Information -->
    <div class="info-card mb-3" v-if="hasMobileData">
      <h4 class="section-title">Mobile Device Information</h4>
      <div class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.mobile?.batteryLevel !== undefined">
          <span class="info-label">Battery Level:</span>
          <div class="w-full">
            <ProgressBar :value="device.mobile.batteryLevel" :showValue="true" />
          </div>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.mobile?.mdmEnrollmentStatus">
          <span class="info-label">MDM Status:</span>
          <Tag :severity="getMDMStatusSeverity(device.mobile.mdmEnrollmentStatus)">
            {{ device.mobile.mdmEnrollmentStatus }}
          </Tag>
        </div>
      </div>
    </div>

    <!-- MDM Profiles -->
    <div class="info-card mb-3" v-if="hasProfiles">
      <h4 class="section-title">MDM Profiles</h4>
      <div class="profile-list">
        <div v-for="(profile, index) in device.mobile.profiles" :key="index" class="profile-item p-3 mb-2">
          <div class="profile-name">{{ profile.name }}</div>
          <div class="profile-details" v-if="profile.id">
            <span class="info-label">ID:</span>
            <span class="info-value">{{ profile.id }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Device Location -->
    <div class="info-card mb-3" v-if="hasLocation">
      <h4 class="section-title">Device Location</h4>
      <div class="grid">
        <div class="col-12 md:col-6 info-row" 
             v-if="device.mobile.location?.latitude !== undefined && device.mobile.location?.longitude !== undefined">
          <span class="info-label">Coordinates:</span>
          <div class="coordinates">
            <span class="info-value">{{ device.mobile.location.latitude }}, {{ device.mobile.location.longitude }}</span>
            <a
              :href="`https://maps.google.com/?q=${device.mobile.location.latitude},${device.mobile.location.longitude}`"
              target="_blank"
              class="map-link ml-2"
            >
              <i class="pi pi-map-marker"></i> View on Map
            </a>
          </div>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.mobile.location?.timestamp">
          <span class="info-label">Last Update:</span>
          <span class="info-value">{{ formatTimestamp(device.mobile.location.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- No Mobile Data Message -->
    <div v-if="!hasMobileData && !hasProfiles && !hasLocation" class="p-4 text-center no-data">
      <i class="pi pi-mobile text-5xl mb-3" style="color: var(--blue-500)"></i>
      <h4>No Mobile Data</h4>
      <p class="text-color-secondary">No mobile device information is available.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from '@vue/runtime-core';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';
import { UnifiedDevice } from '../../../../types/device';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const hasMobileData = computed(() => {
  return props.device.mobile && (
    props.device.mobile.batteryLevel !== undefined ||
    props.device.mobile.mdmEnrollmentStatus
  );
});

const hasProfiles = computed(() => {
  return props.device.mobile?.profiles && props.device.mobile.profiles.length > 0;
});

const hasLocation = computed(() => {
  return props.device.mobile?.location && (
    (props.device.mobile.location.latitude !== undefined && props.device.mobile.location.longitude !== undefined) ||
    props.device.mobile.location.timestamp
  );
});

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
.mobile-section {
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

.profile-item {
  background-color: var(--surface-ground);
  border-radius: 4px;
}

.profile-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.profile-details {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}

.profile-details .info-label {
  margin-bottom: 0;
  margin-right: 0.5rem;
}

.coordinates {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.map-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.875rem;
}

.map-link:hover {
  text-decoration: underline;
}

:deep(.p-progressbar) {
  height: 0.5rem !important;
}

:deep(.p-tag) {
  display: inline-flex;
  width: fit-content;
  min-width: 0;
  padding: 0.15rem 0.4rem;
}
</style> 