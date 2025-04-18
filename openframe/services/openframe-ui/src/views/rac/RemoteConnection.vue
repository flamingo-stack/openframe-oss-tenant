<template>
  <div class="remote-connection">
    <ModuleHeader title="Remote Connection">
      <template #subtitle>Establish remote connections to devices</template>
    </ModuleHeader>
    
    <div class="connection-content" v-if="!selectedDeviceId">
      <div class="select-device-prompt">
        <i class="pi pi-desktop"></i>
        <h3>Select a Device</h3>
        <p>Please select a device from the Devices page to establish a remote connection.</p>
        <OFButton 
          label="Go to Devices" 
          icon="pi pi-arrow-right" 
          @click="router.push('/rac/devices')" 
          class="p-button-primary mt-4"
        />
      </div>
    </div>
    
    <div class="connection-content" v-else>
      <div class="connection-container">
        <div class="connection-header">
          <div class="device-info">
            <i :class="getDeviceIcon(selectedDevice?.platform || 'unknown')" class="mr-2"></i>
            <h3>{{ selectedDevice?.hostname || 'Unknown Device' }}</h3>
          </div>
          <div class="connection-actions">
            <OFButton 
              icon="pi pi-sync" 
              class="p-button-text" 
              v-tooltip.left="'Refresh Connection'" 
            />
            <OFButton 
              icon="pi pi-times" 
              class="p-button-text p-button-danger" 
              v-tooltip.left="'Disconnect'" 
              @click="disconnect"
            />
          </div>
        </div>
        
        <div class="connection-frame">
          <div class="empty-state">
            <i class="pi pi-link empty-icon"></i>
            <h3>No Active Connection</h3>
            <p>The connection to this device is not yet established.</p>
            <p class="hint">Click the button below to connect.</p>
            <OFButton 
              label="Connect" 
              icon="pi pi-link" 
              @click="connect" 
              class="p-button-primary mt-4"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "@vue/runtime-core";
import { useRouter, useRoute } from 'vue-router';
import { OFButton } from '../../components/ui';
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";

interface Device {
  id: string;
  hostname: string;
  platform: string;
  status: string;
}

const router = useRouter();
const route = useRoute();
const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();

const loading = ref(false);
const connecting = ref(false);
const selectedDeviceId = ref<string | null>(route.params.id as string || null);
const selectedDevice = ref<Device | null>(null);

const getDeviceIcon = (platform: string) => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};

const fetchDeviceDetails = async () => {
  if (!selectedDeviceId.value) return;
  
  try {
    loading.value = true;
    // In a real implementation, this would fetch device details from API
    // For now, use mock data
    selectedDevice.value = {
      id: selectedDeviceId.value,
      hostname: `device-${selectedDeviceId.value}`,
      platform: ['windows', 'darwin', 'linux'][Math.floor(Math.random() * 3)],
      status: 'online'
    };
    
    // In a real implementation, this would be:
    // const response = await restClient.get<Device>(`${API_URL}/devices/${selectedDeviceId.value}`);
    // selectedDevice.value = response;
  } catch (error) {
    console.error('Failed to fetch device details:', error);
    toastService.showError('Failed to fetch device details');
  } finally {
    loading.value = false;
  }
};

const connect = async () => {
  if (!selectedDeviceId.value) return;
  
  try {
    connecting.value = true;
    // In a real implementation, this would establish connection to the device
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate connection delay
    toastService.showSuccess('Connection established successfully');
  } catch (error) {
    console.error('Failed to establish connection:', error);
    toastService.showError('Failed to establish connection');
  } finally {
    connecting.value = false;
  }
};

const disconnect = () => {
  // In a real implementation, this would disconnect from the device
  router.push('/rac/devices');
};

onMounted(async () => {
  if (selectedDeviceId.value) {
    await fetchDeviceDetails();
  }
});
</script>

<style scoped>
.remote-connection {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.connection-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: var(--surface-ground);
}

.select-device-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: auto;
  max-width: 500px;
}

.select-device-prompt i {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.select-device-prompt h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.select-device-prompt p {
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.connection-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.device-info {
  display: flex;
  align-items: center;
}

.device-info i {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.device-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.connection-actions {
  display: flex;
  gap: 0.5rem;
}

.connection-frame {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-section);
  padding: 2rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  max-width: 500px;
}

.empty-state .empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.empty-state p.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}
</style>
