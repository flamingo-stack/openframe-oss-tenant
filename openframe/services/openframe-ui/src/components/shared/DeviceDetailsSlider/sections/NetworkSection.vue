<template>
  <div class="network-section">
    <!-- Public IP -->
    <div class="info-card mb-3" v-if="device.network?.publicIp">
      <h4 class="section-title">Public IP Address</h4>
      <div class="ip-display">
        <i class="pi pi-globe mr-2"></i>
        <span class="ip-value">{{ device.network.publicIp }}</span>
      </div>
    </div>

    <!-- Network Interfaces -->
    <div class="info-card mb-3" v-if="hasInterfaces">
      <h4 class="section-title">Network Interfaces</h4>
      <div class="interface-cards">
        <div v-for="(iface, index) in device.network.interfaces" :key="index" class="interface-card mb-3 p-3">
          <div class="interface-header mb-2">
            <span class="interface-name">{{ iface.name }}</span>
            <Tag :severity="getInterfaceStatusSeverity(iface.status)">{{ iface.status || 'Unknown' }}</Tag>
          </div>
          
          <div class="grid">
            <div class="col-12 md:col-6 info-row" v-if="iface.mac">
              <span class="info-label">MAC Address:</span>
              <span class="info-value">{{ iface.mac }}</span>
            </div>
            <div class="col-12 md:col-6 info-row" v-if="iface.speed !== undefined">
              <span class="info-label">Speed:</span>
              <span class="info-value">{{ formatSpeed(iface.speed) }}</span>
            </div>
          </div>

          <!-- IPv4 Addresses -->
          <div v-if="iface.ipv4 && iface.ipv4.length > 0" class="mt-2">
            <div class="info-label">IPv4 Addresses:</div>
            <div v-for="(ip, ipIndex) in iface.ipv4" :key="`${index}-v4-${ipIndex}`" class="ip-item">
              <span class="info-value">{{ ip }}</span>
            </div>
          </div>

          <!-- IPv6 Addresses -->
          <div v-if="iface.ipv6 && iface.ipv6.length > 0" class="mt-2">
            <div class="info-label">IPv6 Addresses:</div>
            <div v-for="(ip, ipIndex) in iface.ipv6" :key="`${index}-v6-${ipIndex}`" class="ip-item">
              <span class="info-value">{{ ip }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- IP Addresses (Fallback if no interfaces) -->
    <div class="info-card mb-3" v-if="hasIPAddresses && !hasInterfaces">
      <h4 class="section-title">IP Addresses</h4>
      <div v-for="(ip, index) in device.network.ipAddresses" :key="index" class="ip-item">
        <span class="info-value">{{ ip }}</span>
      </div>
    </div>

    <!-- MAC Addresses (Fallback if no interfaces) -->
    <div class="info-card mb-3" v-if="hasMACAddresses && !hasInterfaces">
      <h4 class="section-title">MAC Addresses</h4>
      <div v-for="(mac, index) in device.network.macAddresses" :key="index" class="ip-item">
        <span class="info-value">{{ mac }}</span>
      </div>
    </div>

    <!-- No Network Data Message -->
    <div v-if="!hasNetworkData" class="p-4 text-center no-data">
      <i class="pi pi-wifi text-5xl mb-3" style="color: var(--blue-500)"></i>
      <h4>No Network Data</h4>
      <p class="text-color-secondary">No network information is available for this device.</p>
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

const hasInterfaces = computed(() => {
  return props.device.network?.interfaces && props.device.network.interfaces.length > 0;
});

const hasIPAddresses = computed(() => {
  return props.device.network?.ipAddresses && props.device.network.ipAddresses.length > 0;
});

const hasMACAddresses = computed(() => {
  return props.device.network?.macAddresses && props.device.network.macAddresses.length > 0;
});

const hasNetworkData = computed(() => {
  return props.device.network && (
    props.device.network.publicIp || 
    hasInterfaces.value || 
    hasIPAddresses.value || 
    hasMACAddresses.value
  );
});

const getInterfaceStatusSeverity = (status?: string): string => {
  if (!status) return 'info';
  
  const statusLower = status.toLowerCase();
  if (statusLower === 'up' || statusLower === 'connected') {
    return 'success';
  } else if (statusLower === 'down' || statusLower === 'disconnected') {
    return 'danger';
  } else if (statusLower === 'unknown') {
    return 'info';
  }
  
  return 'warning';
};

const formatSpeed = (speed?: number): string => {
  if (speed === undefined) return 'Unknown';
  
  if (speed >= 1000) {
    return `${(speed / 1000).toFixed(1)} Gbps`;
  } else {
    return `${speed} Mbps`;
  }
};
</script>

<style scoped>
.network-section {
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

.ip-display {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  color: var(--primary-color);
}

.ip-value {
  font-family: monospace;
}

.ip-item {
  margin-bottom: 0.25rem;
  padding-left: 0.5rem;
  font-family: monospace;
}

.interface-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.interface-card {
  background-color: var(--surface-ground);
  border-radius: 4px;
}

.interface-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.interface-name {
  font-weight: 600;
  font-size: 1rem;
}

:deep(.p-progressbar) {
  height: 0.5rem !important;
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}
</style> 