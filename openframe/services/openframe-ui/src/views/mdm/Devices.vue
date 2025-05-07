<template>
  <div class="mdm-devices">
    <ModuleHeader title="Devices">
      <template #subtitle>Manage and monitor mobile devices</template>
      <template #actions>
        <OFButton label="Add Device" icon="pi pi-plus" @click="showCreateDialog = true" class="p-button-primary" />
      </template>
    </ModuleHeader>

    <div class="devices-content">
      <SearchBar v-model="filters['global'].value" placeholder="Search devices..." />

      <UnifiedDeviceTable :devices="devices" moduleType="mdm" :loading="loading" emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found" emptyMessage="There are no devices enrolled in MDM yet."
        emptyHint="Devices will appear here once they are enrolled in your MDM server." @viewDetails="viewDevice"
        @deleteDevice="deleteDevice" @lockDevice="lockDevice">
        <Column field="mdm.enrollment_status" header="MDM Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.moduleSpecific?.mdm?.enrollment_status || 'Not enrolled'"
              :severity="getMDMStatusSeverity(data.moduleSpecific?.mdm?.enrollment_status)" />
          </template>
        </Column>
      </UnifiedDeviceTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from '@vue/runtime-core';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { OFButton } from '../../components/ui';
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
import UnifiedDeviceTable from '../../components/shared/UnifiedDeviceTable.vue';
import { getDeviceIcon, formatPlatform, getPlatformSeverity } from '../../utils/deviceUtils';
import { UnifiedDevice, getOriginalDevice, EnhancedUnifiedDevice } from '../../types/device';
import { MDMDevice } from '../../utils/deviceAdapters';

interface FleetResponse {
  hosts: MDMDevice[];
}

const configService = ConfigService.getInstance();
const config = configService.getConfig();

const API_URL = `${config.gatewayUrl}/tools/fleet/api/v1/fleet`;

const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const error = ref('');
const devices = ref<MDMDevice[]>([]);
const showCreateDialog = ref(false);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const selectedDevice = ref<UnifiedDevice | null>(null);

const getMDMStatusSeverity = (status: string | null | undefined) => {
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

    // Store original MDM devices for reference
    devices.value = response.hosts || [];

  } catch (err: any) {
    toastService.showError(err.message);
    devices.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchDeviceDetails = async (deviceId: string) => {
  try {
    const response = await restClient.get<MDMDevice>(`${API_URL}/hosts/${deviceId}`);
    console.log("Fetched device details:", response);
    return response || null;
  } catch (err) {
    console.error('Error fetching device details:', err);
    toastService.showError('Failed to fetch device details');
    return null;
  }
};

const viewDevice = async (device: UnifiedDevice) => {
  try {
    selectedDevice.value = device;
    
    // Fetch device details
    const deviceDetails = await fetchDeviceDetails(device.originalId as string);
    
    if (deviceDetails) {
      console.log('Device details:', deviceDetails);
      toastService.showSuccess('Device details fetched successfully');
    }
  } catch (error) {
    console.error('Error viewing device details:', error);
    toastService.showError('Failed to load device details');
  }
};

const lockDevice = async (device: UnifiedDevice) => {
  try {
    let deviceUuid: string | undefined;

    // Try to get the device UUID directly from the originalId or original device
    if ('originalId' in device && device.originalId) {
      // If we have the device ID, fetch the device to get the UUID
      const detailedDevice = await fetchDeviceDetails(device.originalId as string);
      deviceUuid = detailedDevice?.device_uuid;
    } else {
      const originalDevice = getOriginalDevice<MDMDevice>(device);
      deviceUuid = originalDevice?.device_uuid;
    }

    if (!deviceUuid) {
      toastService.showError('Device UUID not available');
      return;
    }

    await restClient.post(`${API_URL}/global/devices/${deviceUuid}/lock`);
    toastService.showSuccess('Device locked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const unlockDevice = async (device: UnifiedDevice) => {
  try {
    let deviceUuid: string | undefined;

    // Try to get the device UUID directly from the originalId or original device
    if ('originalId' in device && device.originalId) {
      // If we have the device ID, fetch the device to get the UUID
      const detailedDevice = await fetchDeviceDetails(device.originalId as string);
      deviceUuid = detailedDevice?.device_uuid;
    } else {
      const originalDevice = getOriginalDevice<MDMDevice>(device);
      deviceUuid = originalDevice?.device_uuid;
    }

    if (!deviceUuid) {
      toastService.showError('Device UUID not available');
      return;
    }

    await restClient.post(`${API_URL}/global/devices/${deviceUuid}/unlock`);
    toastService.showSuccess('Device unlocked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const eraseDevice = async (device: UnifiedDevice) => {
  try {
    let deviceUuid: string | undefined;

    // Try to get the device UUID directly from the originalId or original device
    if ('originalId' in device && device.originalId) {
      // If we have the device ID, fetch the device to get the UUID
      const detailedDevice = await fetchDeviceDetails(device.originalId as string);
      deviceUuid = detailedDevice?.device_uuid;
    } else {
      const originalDevice = getOriginalDevice<MDMDevice>(device);
      deviceUuid = originalDevice?.device_uuid;
    }

    if (!deviceUuid) {
      toastService.showError('Device UUID not available');
      return;
    }

    await restClient.post(`${API_URL}/global/devices/${deviceUuid}/erase`);
    toastService.showSuccess('Device erase command sent successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const deleteDevice = async (device: UnifiedDevice) => {
  try {
    let deviceId: number | undefined;

    // Try to get the device ID directly from the originalId or original device
    if ('originalId' in device && typeof device.originalId === 'number') {
      deviceId = device.originalId;
    } else {
      const originalDevice = getOriginalDevice<MDMDevice>(device);
      deviceId = originalDevice?.id;
    }

    if (!deviceId) {
      toastService.showError('Device ID not available');
      return;
    }

    await restClient.delete(`${API_URL}/global/hosts/${deviceId}`);
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