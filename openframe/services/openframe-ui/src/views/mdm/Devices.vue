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
      </UnifiedDeviceTable>
    </div>

    <!-- Device Details Slider -->
    <DeviceDetailsSlider v-model:visible="showDeviceDetails" :device="selectedDevice" moduleType="mdm"
      @refreshDevice="fetchDevices" @lockDevice="lockDevice" @unlockDevice="unlockDevice" 
      @deleteDevice="deleteDevice" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from '@vue/runtime-core';
import { OFButton } from '../../components/ui';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import UnifiedDeviceTable from '../../components/shared/UnifiedDeviceTable.vue';
import DeviceDetailsSlider from '../../components/shared/DeviceDetailsSlider.vue';
import { UnifiedDevice } from '../../types/device';
import { MDMDevice } from '../../utils/deviceAdapters';

interface FleetResponse {
  hosts: MDMDevice[];
}

const configService = ConfigService.getInstance();
const config = configService.getConfig();

const API_URL = `${config.gatewayUrl}/tools/fleet/api/v1/fleet`;

const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<MDMDevice[]>([]);
const showCreateDialog = ref(false);
const showDeviceDetails = ref(false);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const selectedDevice = ref<UnifiedDevice | null>(null);

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
    showDeviceDetails.value = true;

    let agentId = device.originalId as string;
    const refreshedDevice = await fetchDeviceDetails(agentId);
    selectedDevice.value = refreshedDevice as any;
  } catch (error) {
    console.error('Error viewing device details:', error);
    toastService.showError('Failed to load device details');
  }
};

const lockDevice = async (device: UnifiedDevice) => {
  await lockOrUnlock(device, 'lock');
};
const unlockDevice = async (device: UnifiedDevice) => {
  await lockOrUnlock(device, 'unlock');
};

const lockOrUnlock = async (device: UnifiedDevice, action: string) => {
  try {
    await restClient.post(`${API_URL}/hosts/${device.originalId}/${action}`);
    toastService.showSuccess('Device locked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const deleteDevice = async (device: UnifiedDevice) => {
  try {
    await restClient.delete(`${API_URL}/hosts/${device.originalId}`);
    toastService.showSuccess('Device deleted successfully');
    await fetchDevices();
  } catch (err: any) {
    toastService.showError(err.message);
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