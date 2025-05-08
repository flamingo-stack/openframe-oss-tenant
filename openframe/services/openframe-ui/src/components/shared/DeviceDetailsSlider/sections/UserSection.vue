<template>
  <div class="user-section">
    <div class="info-card">
      <h4 class="section-title">User Information</h4>
      <div v-if="hasUserData" class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.user?.currentUser">
          <span class="info-label">Current User:</span>
          <span class="info-value">{{ device.user.currentUser }}</span>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.user?.domain">
          <span class="info-label">Domain:</span>
          <span class="info-value">{{ device.user.domain }}</span>
        </div>

        <!-- Logged In Users -->
        <div class="col-12" v-if="hasLoggedInUsers">
          <div class="mt-2 mb-1">
            <span class="info-label">Logged In Users:</span>
          </div>
          <div v-for="(user, index) in device.user.loggedInUsers" :key="index" class="user-item">
            <i class="pi pi-user mr-2"></i>
            <span class="info-value">{{ user }}</span>
          </div>
        </div>
      </div>

      <!-- No User Data Message -->
      <div v-if="!hasUserData" class="p-4 text-center no-data">
        <i class="pi pi-user text-5xl mb-3" style="color: var(--blue-500)"></i>
        <h4>No User Data</h4>
        <p class="text-color-secondary">No user information is available for this device.</p>
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

const hasLoggedInUsers = computed(() => {
  return props.device.user?.loggedInUsers && props.device.user.loggedInUsers.length > 0;
});

const hasUserData = computed(() => {
  return props.device.user && (
    props.device.user.currentUser ||
    props.device.user.domain ||
    hasLoggedInUsers.value
  );
});
</script>

<style scoped>
.user-section {
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

.user-item {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  background-color: var(--surface-ground);
}
</style> 