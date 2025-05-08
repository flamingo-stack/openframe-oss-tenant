<template>
  <div class="security-section">
    <div class="info-card">
      <h4 class="section-title">Security Information</h4>
      <div class="grid">
        <div class="col-12 md:col-6 info-row" v-if="device.security?.antivirusEnabled !== undefined">
          <span class="info-label">Antivirus:</span>
          <Tag :severity="device.security.antivirusEnabled ? 'success' : 'danger'">
            {{ device.security.antivirusEnabled ? 'Enabled' : 'Disabled' }}
          </Tag>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.security?.firewallEnabled !== undefined">
          <span class="info-label">Firewall:</span>
          <Tag :severity="device.security.firewallEnabled ? 'success' : 'danger'">
            {{ device.security.firewallEnabled ? 'Enabled' : 'Disabled' }}
          </Tag>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.security?.encryptionEnabled !== undefined">
          <span class="info-label">Disk Encryption:</span>
          <Tag :severity="device.security.encryptionEnabled ? 'success' : 'danger'">
            {{ device.security.encryptionEnabled ? 'Enabled' : 'Disabled' }}
          </Tag>
        </div>
        <div class="col-12 md:col-6 info-row" v-if="device.security?.lastUpdated">
          <span class="info-label">Last Update:</span>
          <span class="info-value">{{ formatTimestamp(device.security.lastUpdated) }}</span>
        </div>
      </div>
    </div>

    <!-- Vulnerabilities -->
    <div class="mt-3" v-if="hasVulnerabilities">
      <div class="info-card">
        <div class="section-header">
          <h4 class="section-title">Vulnerabilities</h4>
          <Tag 
            v-if="vulnerabilityCount > 0" 
            severity="danger" 
            class="ml-2"
          >
            {{ vulnerabilityCount }} vulnerabilities found
          </Tag>
        </div>
        <VulnerabilityTable 
          :vulnerabilities="device.security?.vulnerabilities" 
          @count="updateVulnerabilityCount"
        />
      </div>
    </div>

    <!-- No Security Data Message -->
    <div v-if="!hasSecurityData" class="mt-3 p-4 text-center no-data">
      <i class="pi pi-shield text-5xl mb-3" style="color: var(--blue-500)"></i>
      <h4>No Security Data</h4>
      <p class="text-color-secondary">No security information is available for this device.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref } from '@vue/runtime-core';
import Tag from 'primevue/tag';
import { UnifiedDevice } from '../../../../types/device';
import VulnerabilityTable from '../tables/VulnerabilityTable.vue';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice,
    required: true
  }
});

const vulnerabilityCount = ref(0);

const updateVulnerabilityCount = (count: number) => {
  vulnerabilityCount.value = count;
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

const hasVulnerabilities = computed(() => {
  return props.device.security?.vulnerabilities && props.device.security.vulnerabilities.length > 0;
});

const hasSecurityData = computed(() => {
  const security = props.device.security;
  return security && (
    security.antivirusEnabled !== undefined ||
    security.firewallEnabled !== undefined ||
    security.encryptionEnabled !== undefined ||
    security.lastUpdated !== undefined ||
    hasVulnerabilities.value
  );
});
</script>

<style scoped>
.security-section {
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

.section-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.section-header .section-title {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
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