<template>
  <div class="rac-devices">
    <ModuleHeader title="Devices">
      <template #subtitle>Connect to and control remote devices</template>
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
        :searchFields="['hostname', 'platform', 'status']"
        emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found"
        emptyMessage="Add your first device to start remote management."
        emptyHint="Devices will appear here once they are added to MeshCentral."
      >
        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getDeviceIcon(data.platform)" class="mr-2"></i>
              <span>{{ data.hostname }}</span>
            </div>
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable>
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="lastSeen" header="Last Seen" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.lastSeen) }}</span>
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
import { ref, onMounted } from "@vue/runtime-core";
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

interface Device {
  id: string;
  hostname: string;
  platform: string;
  status: string;
  lastSeen: string;
}

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

const formatPlatform = (platform: string) => {
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux'
  };
  return platformMap[platform] || platform;
};

const getDeviceIcon = (platform: string) => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};

const getPlatformSeverity = (platform: string) => {
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success'
  };
  return severityMap[platform] || 'info';
};

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
        platform: 'windows',
        status: 'online',
        lastSeen: new Date().toISOString()
      },
      {
        id: '2',
        hostname: 'laptop-002',
        platform: 'darwin',
        status: 'offline',
        lastSeen: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        hostname: 'server-001',
        platform: 'linux',
        status: 'online',
        lastSeen: new Date().toISOString()
      }
    ];
    
    // In a real implementation, this would be:
    // const response = await restClient.get<Device[]>(`${API_URL}/devices/`);
    // devices.value = Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    loading.value = false;
  }
};

const remoteConnect = (device: Device) => {
  router.push(`/rac/remote-connection/${device.id}`);
};

const fileTransfer = (device: Device) => {
  router.push(`/rac/file-transfer/${device.id}`);
};

const viewDevice = (device: Device) => {
  // Implement view device details
  console.log('View device:', device);
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

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}

:deep(.p-datatable) {
  background: var(--surface-card);
  border-radius: var(--border-radius);
}
</style>
