<template>
  <ModuleLayout>
    <template #sidebar>
      <!-- Add sidebar content here -->
    </template>

    <div class="rmm-devices">
      <ModuleHeader title="Devices">
        <template #actions>
          <Button 
            label="Add Device" 
            icon="pi pi-plus"
            @click="showAddDeviceDialog = true"
            class="p-button-primary"
          />
        </template>
      </ModuleHeader>

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
        emptyMessage="Add your first device to start monitoring."
        emptyHint="Devices will appear here once they are added to your RMM server."
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

        <Column field="last_seen" header="Last Seen" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.last_seen) }}</span>
          </template>
        </Column>

        <Column field="ip_address" header="IP Address" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.ip_address }}</span>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-desktop" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Remote Control'"
                @click="remoteControl(data)" 
              />
              <Button 
                icon="pi pi-terminal" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Run Command'"
                @click="runCommand(data)" 
              />
              <Button 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewDevice(data)" 
              />
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Device'"
                @click="editDevice(data)" 
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

    <!-- Add/Edit Device Dialog -->
    <Dialog 
      v-model:visible="showAddDeviceDialog" 
      :style="{ width: '600px' }" 
      :header="isEditMode ? 'Edit Device' : 'Add New Device'" 
      :modal="true"
      class="p-fluid"
    >
      <div class="field">
        <label for="hostname">Hostname</label>
        <InputText 
          id="hostname" 
          v-model="newDevice.hostname" 
          required 
          autofocus 
          :class="{ 'p-invalid': submitted && !newDevice.hostname }"
        />
        <small class="p-error" v-if="submitted && !newDevice.hostname">
          Hostname is required.
        </small>
      </div>

      <div class="field">
        <label for="platform">Platform</label>
        <Dropdown
          id="platform"
          v-model="newDevice.platform"
          :options="platforms"
          optionLabel="name"
          optionValue="value"
          placeholder="Select a platform"
          :class="{ 'p-invalid': submitted && !newDevice.platform }"
        />
        <small class="p-error" v-if="submitted && !newDevice.platform">
          Platform is required.
        </small>
      </div>

      <div class="field">
        <label for="os_version">OS Version</label>
        <InputText 
          id="os_version" 
          v-model="newDevice.os_version" 
          required 
          :class="{ 'p-invalid': submitted && !newDevice.os_version }"
        />
        <small class="p-error" v-if="submitted && !newDevice.os_version">
          OS Version is required.
        </small>
      </div>

      <div class="field">
        <label for="ip_address">IP Address</label>
        <InputText 
          id="ip_address" 
          v-model="newDevice.ip_address" 
          required 
          :class="{ 'p-invalid': submitted && !newDevice.ip_address }"
        />
        <small class="p-error" v-if="submitted && !newDevice.ip_address">
          IP Address is required.
        </small>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="hideDialog"
        />
        <Button 
          :label="isEditMode ? 'Save' : 'Add'" 
          icon="pi pi-check" 
          class="p-button-text" 
          @click="saveDevice" 
          :loading="submitting"
        />
      </template>
    </Dialog>

    <!-- Run Command Dialog -->
    <Dialog 
      v-model:visible="showRunCommandDialog" 
      :style="{ width: '600px' }" 
      header="Run Command" 
      :modal="true"
      class="p-fluid"
    >
      <div class="field">
        <label for="command">Command</label>
        <Textarea 
          id="command" 
          v-model="command" 
          rows="3" 
          class="font-mono" 
          :class="{ 'p-invalid': commandSubmitted && !command }"
          placeholder="Enter command to execute"
        />
        <small class="p-error" v-if="commandSubmitted && !command">
          Command is required.
        </small>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="showRunCommandDialog = false"
        />
        <Button 
          label="Run" 
          icon="pi pi-play" 
          class="p-button-text" 
          @click="executeCommand" 
          :loading="executing"
        />
      </template>
    </Dialog>

    <!-- Delete Device Confirmation -->
    <Dialog 
      v-model:visible="deleteDeviceDialog" 
      :style="{ width: '450px' }" 
      header="Confirm" 
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedDevice">
          Are you sure you want to delete <b>{{ selectedDevice.hostname }}</b>?
        </span>
      </div>
      <template #footer>
        <Button 
          label="No" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="deleteDeviceDialog = false"
        />
        <Button 
          label="Yes" 
          icon="pi pi-check" 
          class="p-button-text" 
          @click="confirmDelete" 
          :loading="deleting"
        />
      </template>
    </Dialog>
  </ModuleLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';
import ModuleLayout from '../../components/shared/ModuleLayout.vue';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';

interface Device {
  id: string;
  hostname: string;
  platform: string;
  os_version: string;
  status: string;
  last_seen: string;
  ip_address: string;
}

interface DevicesResponse {
  data: Device[];
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm`;
const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<Device[]>([]);
const showAddDeviceDialog = ref(false);
const showRunCommandDialog = ref(false);
const deleteDeviceDialog = ref(false);
const submitted = ref(false);
const commandSubmitted = ref(false);
const submitting = ref(false);
const executing = ref(false);
const deleting = ref(false);
const isEditMode = ref(false);

const selectedDevice = ref<Device | null>(null);
const command = ref('');

const newDevice = ref({
  hostname: '',
  platform: null as string | null,
  os_version: '',
  ip_address: ''
});

const platforms = [
  { name: 'Windows', value: 'windows' },
  { name: 'macOS', value: 'macos' },
  { name: 'Linux', value: 'linux' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  const platformMap: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux'
  };
  return platformMap[platform] || platform;
};

const getDeviceIcon = (platform: string) => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    macos: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};

const getPlatformSeverity = (platform: string) => {
  const severityMap: Record<string, string> = {
    windows: 'info',
    macos: 'warning',
    linux: 'success'
  };
  return severityMap[platform] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    online: 'success',
    offline: 'danger',
    pending: 'warning',
    unknown: 'info'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const fetchDevices = async () => {
  loading.value = true;
  try {
    const response = await restClient.get<DevicesResponse>(`${API_URL}/agents/`);
    devices.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    loading.value = false;
  }
};

const hideDialog = () => {
  showAddDeviceDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newDevice.value = {
    hostname: '',
    platform: null,
    os_version: '',
    ip_address: ''
  };
};

const saveDevice = async () => {
  submitted.value = true;

  if (!newDevice.value.hostname || !newDevice.value.platform || 
      !newDevice.value.os_version || !newDevice.value.ip_address) {
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value && selectedDevice.value) {
      await restClient.patch(`${API_URL}/agents/${selectedDevice.value.id}/`, newDevice.value);
      toastService.showSuccess('Device updated successfully');
    } else {
      await restClient.post(`${API_URL}/agents/`, newDevice.value);
      toastService.showSuccess('Device added successfully');
    }
    await fetchDevices();
    hideDialog();
  } catch (error: any) {
    console.error('Error saving device:', error);
    toastService.showError(isEditMode.value ? 'Failed to update device' : 'Failed to add device');
  } finally {
    submitting.value = false;
  }
};

const remoteControl = (device: Device) => {
  // Implement remote control functionality
  console.log('Remote control:', device);
};

const runCommand = (device: Device) => {
  selectedDevice.value = device;
  command.value = '';
  commandSubmitted.value = false;
  showRunCommandDialog.value = true;
};

const executeCommand = async () => {
  if (!selectedDevice.value) return;

  commandSubmitted.value = true;
  if (!command.value) return;

  executing.value = true;
  try {
    await restClient.post(`${API_URL}/agents/${selectedDevice.value.id}/cmd/`, {
      cmd: command.value
    });
    showRunCommandDialog.value = false;
    command.value = '';
    toastService.showSuccess('Command executed successfully');
  } catch (error: any) {
    console.error('Error executing command:', error);
    toastService.showError('Failed to execute command');
  } finally {
    executing.value = false;
    commandSubmitted.value = false;
  }
};

const viewDevice = (device: Device) => {
  // Implement device details view
  console.log('View device:', device);
};

const editDevice = (device: Device) => {
  selectedDevice.value = device;
  newDevice.value = {
    hostname: device.hostname,
    platform: device.platform,
    os_version: device.os_version,
    ip_address: device.ip_address
  };
  isEditMode.value = true;
  showAddDeviceDialog.value = true;
};

const deleteDevice = (device: Device) => {
  selectedDevice.value = device;
  deleteDeviceDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedDevice.value) return;

  deleting.value = true;
  try {
    await restClient.delete(`${API_URL}/agents/${selectedDevice.value.id}/`);
    await fetchDevices();
    deleteDeviceDialog.value = false;
    selectedDevice.value = null;
    toastService.showSuccess('Device deleted successfully');
  } catch (error: any) {
    console.error('Error deleting device:', error);
    toastService.showError('Failed to delete device');
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await fetchDevices();
});
</script>

<style scoped>
.rmm-devices {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.font-mono {
  font-family: monospace;
}
</style> 