<template>
  <div class="mdm-devices">
    <ModuleHeader title="Devices">
      <template #actions>
        <Button 
          label="Add Device" 
          icon="pi pi-plus" 
          @click="showCreateDialog = true"
          class="p-button-primary" 
        />
      </template>
    </ModuleHeader>

    <div class="devices-content">
      <SearchBar
        v-model="filters['global'].value"
        placeholder="Search devices..."
      />

      <ModuleTable
        :items="devices"
        :loading="loading"
        :searchFields="['hostname', 'platform', 'os_version', 'status']"
        emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found"
        emptyMessage="There are no devices enrolled in MDM yet."
        emptyHint="Devices will appear here once they are enrolled in your MDM server."
      >
        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i class="pi pi-desktop mr-2"></i>
              <span>{{ data.display_name || data.hostname }}</span>
            </div>
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable>
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" 
                 :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="os_version" header="OS Version" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.os_version }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" 
                 :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="mdm.enrollment_status" header="MDM Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.mdm?.enrollment_status || 'Not enrolled'" 
                 :severity="getMDMStatusSeverity(data.mdm?.enrollment_status)" />
          </template>
        </Column>

        <Column field="actions" header="Actions" :sortable="false" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-lock" 
                class="p-button-text p-button-sm" 
                :disabled="!data.mdm?.enrollment_status"
                v-tooltip.top="'Lock Device'"
                @click="lockDevice(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Device'"
                @click="deleteDevice(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from '@vue/runtime-core';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';

interface FleetResponse {
  hosts: any[];
}

const configService = ConfigService.getInstance();
const config = configService.getConfig();

const API_URL = `${config.gatewayUrl}/tools/fleet/api/v1/fleet`;

const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const error = ref('');
const devices = ref<any[]>([]);
const showCreateDialog = ref(false);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    ios: 'iOS',
    ipados: 'iPadOS',
    chrome: 'Chrome OS'
  };
  return platformMap[platform] || platform;
};

const getPlatformSeverity = (platform: string) => {
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success',
    ios: 'info',
    ipados: 'info',
    chrome: 'warning'
  };
  return severityMap[platform] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    online: 'success',
    offline: 'danger',
    unknown: 'warning'
  };
  return severityMap[status] || 'warning';
};

const getMDMStatusSeverity = (status: string | null) => {
  if (!status) return 'danger';
  if (status.toLowerCase().includes('on')) return 'success';
  if (status.toLowerCase().includes('pending')) return 'warning';
  return 'info';
};

const extractUrlFromMessage = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.match(urlRegex);
  if (match) {
    const url = match[0];
    const textWithoutUrl = message.replace(url, '');
    return { url, text: textWithoutUrl.trim() };
  }
  return { text: message };
};

const fetchDevices = async () => {
  loading.value = true;
  try {
    const response = await restClient.get(`${API_URL}/hosts`) as FleetResponse;
    devices.value = response.hosts || [];
  } catch (err: any) {
    toastService.showError(err.message);
  } finally {
    loading.value = false;
  }
};

const lockDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/global/devices/${device.device_uuid}/lock`);
    toastService.showSuccess('Device locked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const unlockDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/global/devices/${device.device_uuid}/unlock`);
    toastService.showSuccess('Device unlocked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const eraseDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/global/devices/${device.device_uuid}/erase`);
    toastService.showSuccess('Device erase command sent successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const deleteDevice = async (device: any) => {
  try {
    await restClient.delete(`${API_URL}/global/hosts/${device.id}`);
    await fetchDevices();
    toastService.showSuccess('Device deleted successfully');
  } catch (err) {
    console.error('Error deleting device:', err);
    toastService.showError('Failed to delete device');
  }
};

onMounted(() => {
  fetchDevices();
});
</script>

<style scoped>
.mdm-devices {
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
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}
</style> 