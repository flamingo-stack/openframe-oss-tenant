<template>
  <div class="rmm-devices">
    <ModuleHeader title="Devices">
      <template #actions>
        <Button label="Add Device" icon="pi pi-plus" @click="showAddDeviceDialog = true" class="p-button-primary" />
        <Button icon="pi pi-history" class="p-button-text" @click="showExecutionHistory = true" 
          v-tooltip.left="'Script Execution History'" />
      </template>
    </ModuleHeader>

    <div class="devices-content">
      <SearchBar v-model="filters['global'].value" placeholder="Search devices..." />

      <ModuleTable :items="devices" :loading="loading"
        :searchFields="['hostname', 'plat', 'operating_system', 'status']" emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found" emptyMessage="Add your first device to start monitoring."
        emptyHint="Devices will appear here once they are added to your RMM server.">
        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
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

        <Column field="operating_system" header="OS Version" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.operating_system || 'Unknown' }}</span>
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

        <Column field="public_ip" header="IP Address" sortable>
          <template #body="{ data }">
            <div class="flex flex-column gap-1">
              <span v-for="(ip, index) in getIPv4Addresses(data.local_ips)" :key="index" class="text-sm">
                {{ ip }}
              </span>
              <span v-if="!getIPv4Addresses(data.local_ips).length" class="text-sm">N/A</span>
            </div>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button icon="pi pi-code" class="p-button-text p-button-sm" v-tooltip.top="'Run Command'"
                @click="runCommand(data)" />
              <Button icon="pi pi-eye" class="p-button-text p-button-sm" v-tooltip.top="'View Details'"
                @click="viewDevice(data)" />
              <Button icon="pi pi-pencil" class="p-button-text p-button-sm" v-tooltip.top="'Edit Device'"
                @click="editDevice(data)" />
              <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                v-tooltip.top="'Delete Device'" @click="deleteDevice(data)" />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Add/Edit Device Dialog -->
    <DeviceDialog v-model:visible="showAddDeviceDialog" :isEditMode="isEditMode" :loading="submitting"
      :initialDevice="newDevice" @save="saveDevice" @cancel="hideDialog" />

    <!-- Run Command Dialog -->
    <CommandDialog
      v-model:visible="showRunCommandDialog"
      :loading="executing"
      :lastCommand="lastCommand"
      @run="executeCommand"
      @update:output="updateCommandOutput"
      @cancel="showRunCommandDialog = false"
    />

    <!-- Delete Device Confirmation -->
    <Dialog v-model:visible="deleteDeviceDialog" header="Confirm" :modal="true" :draggable="false"
      :style="{ width: '450px' }" class="p-dialog-custom" :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedDevice">
          Are you sure you want to delete <b>{{ selectedDevice.hostname }}</b>?
        </span>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button label="No" icon="pi pi-times" class="p-button-text" @click="deleteDeviceDialog = false" />
          <Button label="Yes" icon="pi pi-check" class="p-button-danger" @click="confirmDelete" :loading="deleting" />
        </div>
      </template>
    </Dialog>

    <!-- Script Execution History -->
    <ScriptExecutionHistory
      v-model:visible="showExecutionHistory"
      ref="executionHistoryRef"
    />
  </div>
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
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import DeviceDialog from '../../components/shared/DeviceDialog.vue';
import CommandDialog from '../../components/shared/CommandDialog.vue';
import ScriptExecutionHistory from '../../components/shared/ScriptExecutionHistory.vue';

interface Device {
  agent_id: string;
  hostname: string;
  plat: string;
  operating_system: string;
  status: string;
  last_seen: string;
  public_ip: string;
  local_ips: string;
  // Add other fields as needed
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
const lastCommand = ref<{ cmd: string; output: string } | null>(null);

const newDevice = ref<{
  hostname: string;
  platform: string | null;
  os_version: string;
  ip_address: string;
}>({
  hostname: '',
  platform: null,
  os_version: '',
  ip_address: ''
});

const platforms = [
  { name: 'Windows', value: 'windows' },
  { name: 'macOS', value: 'darwin' },
  { name: 'Linux', value: 'linux' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const showExecutionHistory = ref(false);
const executionHistoryRef = ref<InstanceType<typeof ScriptExecutionHistory> | null>(null);

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
    overdue: 'warning',
    unknown: 'info'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const getIPv4Addresses = (ips: string) => {
  if (!ips) return [];

  // Split the IPs string into an array
  const ipList = ips.split(',').map(ip => ip.trim());

  // Filter to get only IPv4 addresses
  return ipList
    .map(ip => ip.split('/')[0]) // Remove CIDR notation
    .filter(ip => ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) // Only IPv4
    .sort((a, b) => { // Sort private IPs after public IPs
      const isPrivateA = isPrivateIP(a);
      const isPrivateB = isPrivateIP(b);
      if (isPrivateA === isPrivateB) return 0;
      return isPrivateA ? 1 : -1;
    });
};

const isPrivateIP = (ip: string) => {
  return ip.startsWith('127.') || // Loopback
    ip.startsWith('169.254.') || // Link-local
    ip.startsWith('172.16.') || // Private network
    ip.startsWith('192.168.') || // Private network
    ip.startsWith('10.'); // Private network
};

const fetchDevices = async () => {
  loading.value = true;
  try {
    const response = await restClient.get<Device[]>(`${API_URL}/agents/`);
    devices.value = response || [];
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    devices.value = [];
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
      await restClient.patch(`${API_URL}/agents/${selectedDevice.value.agent_id}/`, newDevice.value);
    } else {
      await restClient.post(`${API_URL}/agents/`, newDevice.value);
    }
    await fetchDevices();
    hideDialog();
  } catch (error: any) {
    console.error('Error saving device:', error);
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
  lastCommand.value = null;
  command.value = '';
  commandSubmitted.value = false;
  showRunCommandDialog.value = true;
};

const executeCommand = async (cmd: string) => {
  if (!selectedDevice.value) return;

  console.log('Executing command:', cmd);
  
  // Store the command
  lastCommand.value = { cmd, output: '' };
  
  // Close the command dialog and show history
  showRunCommandDialog.value = false;
  showExecutionHistory.value = true;
  
  // Add pending execution to history
  const executionId = executionHistoryRef.value?.addExecution({
    deviceName: selectedDevice.value.hostname,
    command: cmd,
    output: 'Executing...',
    status: 'pending'
  });
  
  executing.value = true;
  try {
    console.log('Sending request to:', `${API_URL}/agents/${selectedDevice.value.agent_id}/cmd/`);
    
    const response = await restClient.post<string>(`${API_URL}/agents/${selectedDevice.value.agent_id}/cmd/`, {
      shell: "/bin/bash",
      cmd: cmd,
      timeout: 30,
      custom_shell: null,
      run_as_user: false
    });

    console.log('Command response:', response);

    // Parse the output - remove surrounding quotes and handle escaped newlines
    const output = response ? response
      .replace(/^"/, '')  // Remove leading quote
      .replace(/"$/, '')  // Remove trailing quote
      .replace(/\\n/g, '\n')  // Replace escaped newlines with actual newlines
      : 'No output';

    // Store the output
    if (lastCommand.value) {
      lastCommand.value.output = output;
    }

    // Update execution history
    if (executionId) {
      executionHistoryRef.value?.updateExecution(executionId, {
        output,
        status: 'success'
      });
    }

  } catch (error: any) {
    console.error('Error executing command:', error);
    const errorMessage = error.response?.data || error.message || 'Failed to execute command';
    
    // Update execution history with error
    if (executionId) {
      executionHistoryRef.value?.updateExecution(executionId, {
        output: errorMessage,
        status: 'error'
      });
    }
  } finally {
    executing.value = false;
  }
};

const updateCommandOutput = (output: string) => {
  // No longer needed as we're handling output in toast
  console.log('Command output received:', output);
};

const viewDevice = (device: Device) => {
  // Implement device details view
  console.log('View device:', device);
};

const editDevice = (device: Device) => {
  selectedDevice.value = device;
  newDevice.value = {
    hostname: device.hostname,
    platform: device.plat,
    os_version: device.operating_system,
    ip_address: device.public_ip
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
    await restClient.delete(`${API_URL}/agents/${selectedDevice.value.agent_id}/`);
    await fetchDevices();
    deleteDeviceDialog.value = false;
    selectedDevice.value = null;
  } catch (error: any) {
    console.error('Error deleting device:', error);
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

:deep(.p-dialog-mask) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.p-dialog) {
  margin: 0 auto !important;
}

:deep(.p-dialog-content) {
  overflow-y: auto !important;
  max-height: calc(90vh - 120px) !important;
}

:deep(.clickable-toast) {
  cursor: pointer !important;
}

:deep(.p-toast-message) {
  display: flex;
  align-items: center;
}

.p-dialog-custom {
  .p-dialog-header {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-dialog-content {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
  }

  .p-dialog-footer {
    background: var(--surface-section);
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--surface-border);
  }
}
</style>