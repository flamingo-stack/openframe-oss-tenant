<template>
  <div class="rac-devices">
    <ModuleHeader title="RAC Devices">
      <template #subtitle>Remote Access and Control Devices</template>
      <template #actions>
        <OFButton 
          icon="pi pi-refresh" 
          class="p-button-text" 
          @click="fetchDevices" 
          v-tooltip.left="'Refresh Devices'" 
        />
      </template>
    </ModuleHeader>

    <div class="devices-content">
      <div class="filters-container">
        <div class="filters-row">
          <div class="search-container">
            <SearchBar v-model="filters['global'].value" placeholder="Search devices..." />
          </div>
        </div>
      </div>

      <ModuleTable 
        :items="devices" 
        :loading="loading"
        :searchFields="['hostname', 'plat', 'operating_system', 'status']"
        emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found"
        emptyMessage="Add your first device to start remote management."
        emptyHint="Devices will appear here once they are added to MeshCentral."
      >
        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            <div class="device-name-cell">
              <i :class="getDeviceIcon(data.plat)" class="mr-2"></i>
              <span>{{ data.hostname }}</span>
            </div>
          </template>
        </Column>

        <Column field="plat" header="Platform" sortable>
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.plat)" :severity="getPlatformSeverity(data.plat)" />
          </template>
        </Column>

        <Column field="operating_system" header="Operating System" sortable>
          <template #body="{ data }">
            <span>{{ data.operating_system }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="last_seen" header="Last Seen" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.last_seen) }}</span>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <OFButton 
                icon="pi pi-desktop" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Remote Connect'"
                @click="remoteConnect(data)" 
              />
              <OFButton 
                icon="pi pi-file" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'File Transfer'"
                @click="fileTransfer(data)" 
              />
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewDevice(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from 'vue-router';
import { OFButton } from '../../components/ui';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import { getDeviceIcon, formatPlatform, getPlatformSeverity } from '../../utils/deviceUtils';
import type { Device } from '../../types/rac';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<Device[]>([]);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

// Using imported utility functions from deviceUtils.ts

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    online: 'success',
    offline: 'danger',
    idle: 'warning',
    unknown: 'info'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    // For initial implementation, use mock data
    // Later will be connected to actual MeshCentral API
    devices.value = [
      {
        id: '1',
        hostname: 'desktop-001',
        plat: 'windows',
        operating_system: 'Windows 10 Pro',
        status: 'online',
        last_seen: new Date().toISOString(),
        public_ip: '192.168.1.100',
        local_ips: ['10.0.0.1']
      },
      {
        id: '2',
        hostname: 'laptop-002',
        plat: 'darwin',
        operating_system: 'macOS 12.6',
        status: 'offline',
        last_seen: new Date(Date.now() - 86400000).toISOString(),
        public_ip: '192.168.1.101',
        local_ips: ['10.0.0.2']
      },
      {
        id: '3',
        hostname: 'server-001',
        plat: 'linux',
        operating_system: 'Ubuntu 22.04 LTS',
        status: 'online',
        last_seen: new Date().toISOString(),
        public_ip: '192.168.1.102',
        local_ips: ['10.0.0.3']
      }
    ];
    
    // In a real implementation, this would be:
    // const response = await restClient.get<DeviceResponse>(`${API_URL}/devices/`);
    // devices.value = response?.data || [];
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    loading.value = false;
  }
};

// Using the existing formatTimestamp and getStatusSeverity functions

const remoteConnect = (device: Device) => {
  router.push(`/rac/remote-connection/${device.id}`);
  toastService.showInfo(`Connecting to ${device.hostname}...`);
};

const fileTransfer = (device: Device) => {
  router.push(`/rac/file-transfer/${device.id}`);
  toastService.showInfo(`Opening file transfer for ${device.hostname}...`);
};

const viewDevice = (device: Device) => {
  // In a real implementation, this would open a device details dialog
  console.log('View device:', device);
  toastService.showInfo(`Viewing details for ${device.hostname}`);
};

onMounted(async () => {
  await fetchDevices();
});
</script>

<style scoped>
.rac-devices {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.devices-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  min-height: 0;
  background: var(--surface-ground);
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 250px;
}

.device-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.device-name-cell i {
  font-size: 1.2rem;
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}

:deep(.p-datatable) {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-card);
  color: var(--text-color-secondary);
  padding: 1rem 1.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: none;
  border-bottom: 2px solid var(--surface-border);
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  background: var(--surface-card);
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: var(--surface-hover);
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 1.25rem 1.5rem;
  border: none;
  color: var(--text-color);
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
