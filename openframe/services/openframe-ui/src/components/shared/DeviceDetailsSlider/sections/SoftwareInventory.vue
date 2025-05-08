<template>
  <div class="software-inventory-section">
    <div class="info-card">
      <h4 class="section-title">Software Inventory</h4>
      <div v-if="device.software && device.software.length > 0">
        <SoftwareTable :software="device.software" />
      </div>
      
      <div v-else class="of-empty-state">
        <div class="of-empty-state__icon">
          <i class="pi pi-box"></i>
        </div>
        <h3 class="of-empty-state__title">No Software Inventory</h3>
        <p class="of-empty-state__message">No software inventory data available for this device.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from '@vue/runtime-core';
import { UnifiedDevice } from '../../../../types/device';
import SoftwareTable from '../tables/SoftwareTable.vue';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});
</script>

<style scoped>
.software-inventory-section {
  margin-bottom: var(--spacing-lg, 24px);
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

.of-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl, 32px);
  text-align: center;
  background-color: var(--surface-section);
  border-radius: var(--border-radius, 6px);
}

.of-empty-state__icon {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md, 16px);
}

.of-empty-state__title {
  margin: 0 0 var(--spacing-sm, 8px) 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.of-empty-state__message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}
</style> 