<template>
  <div class="rmm-devices">
    <ModuleHeader title="Devices">
      <template #subtitle>View and manage connected devices</template>
      <template #actions>
        <OFButton icon="pi pi-history" class="p-button-text" @click="showExecutionHistory = true" 
          v-tooltip.left="'Script Execution History'" />
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

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <OFButton icon="pi pi-code" class="p-button-text p-button-sm" v-tooltip.top="'Run Command'"
                @click="runCommand(data)" />
              <OFButton icon="pi pi-eye" class="p-button-text p-button-sm" v-tooltip.top="'View Details'"
                @click="viewDevice(data)" />
              <OFButton icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                v-tooltip.top="'Delete Device'" @click="deleteDevice(data)" />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Run Command Dialog -->
    <CommandDialog
      v-model:visible="showRunCommandDialog"
      :loading="executing"
      :lastCommand="lastCommand"
      :devicePlatform="selectedDevice?.plat"
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
          <OFButton label="No" icon="pi pi-times" class="p-button-text" @click="deleteDeviceDialog = false" />
          <OFButton label="Yes" icon="pi pi-check" class="p-button-danger" @click="confirmDelete" :loading="deleting" />
        </div>
      </template>
    </Dialog>

    <!-- Script Execution History -->
    <ScriptExecutionHistory
      v-model:visible="showExecutionHistory"
      ref="executionHistoryRef"
    />

    <!-- Device Details Dialog -->
    <DeviceDetailsDialog
      v-model:visible="showDeviceDetailsDialog"
      :device="selectedDevice"
      @runCommand="handleDeviceDetailsRunCommand"
      @delete="handleDeviceDetailsDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "@vue/runtime-core";
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { OFButton } from '../../components/ui';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import CommandDialog from '../../components/shared/CommandDialog.vue';
import ScriptExecutionHistory from '../../components/shared/ScriptExecutionHistory.vue';
import DeviceDetailsDialog from '../../components/shared/DeviceDetailsDialog.vue';
import type { Device, CommandResponse, DeviceResponse } from '../../types/rmm';
import { getDeviceIcon, formatPlatform, getPlatformSeverity } from '../../utils/deviceUtils';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<Device[]>([]);
const showRunCommandDialog = ref(false);
const deleteDeviceDialog = ref(false);
const showDeviceDetailsDialog = ref(false);
const executing = ref(false);
const deleting = ref(false);

const selectedDevice = ref<Device | null>(null);
const command = ref('');
const lastCommand = ref<{ cmd: string; output: string } | null>(null);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const showExecutionHistory = ref(false);
const executionHistoryRef = ref<InstanceType<typeof ScriptExecutionHistory> | null>(null);

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
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getIPv4Addresses = (ips: string) => {
  if (!ips) return [];

  // Split the IPs string into an array
  const ipList = ips.split(',').map(ip => ip.trim());

  // Filter for IPv4 addresses
  return ipList.filter(ip => {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  });
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    
    const response = await restClient.get<Device[]>(`${API_URL}/agents/`);
    devices.value = Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    loading.value = false;
  }
};

const remoteControl = (device: Device) => {
  // Implement remote control functionality
  console.log('Remote control:', device);
};

const runCommand = (device: Device) => {
  selectedDevice.value = device;
  showRunCommandDialog.value = true;
};

const executeCommand = async (cmd: string, shell: string, timeout: number, runAsUser: boolean) => {
  if (!selectedDevice.value) return;

  let executionId: string | undefined;
  
  // Add command to execution history with pending status and close dialog immediately
  if (executionHistoryRef.value) {
    executionId = executionHistoryRef.value.addExecution({
      deviceName: selectedDevice.value.hostname,
      command: cmd,
      output: 'Executing command...',
      status: 'pending',
      agent_id: selectedDevice.value.agent_id
    });
  }

  // Close dialog and show history immediately
  showRunCommandDialog.value = false;
  showExecutionHistory.value = true;

  try {
    executing.value = true;
    
    // Determine shell based on platform and shell type
    let shellPath = '/bin/bash';
    if (selectedDevice.value.plat === 'windows') {
      shellPath = shell === 'powershell' ? 'powershell' : 'cmd';
    } else if (selectedDevice.value.plat === 'darwin' || selectedDevice.value.plat === 'linux') {
      shellPath = '/bin/bash';
    }
    
    const response = await restClient.post<string>(`${API_URL}/agents/${selectedDevice.value.agent_id}/cmd/`, {
      shell: shellPath,
      cmd: cmd,
      timeout: timeout,
      custom_shell: null,
      run_as_user: runAsUser
    });

    lastCommand.value = {
      cmd,
      output: response || 'No output'
    };

    // Update execution history with success status and output
    if (executionHistoryRef.value && executionId) {
      executionHistoryRef.value.updateExecution(executionId, {
        output: response || 'No output',
        status: 'success'
      });
    }

    toastService.showSuccess(response || 'Command executed successfully');
  } catch (error) {
    console.error('Failed to execute command:', error);
    const errorMessage = error instanceof Error ? error.message : 
                        (typeof error === 'object' && error !== null && 'data' in error ? 
                         (error as {data: string}).data : 'Failed to execute command');
    toastService.showError(errorMessage);

    // Update execution history with error status
    if (executionHistoryRef.value && executionId) {
      executionHistoryRef.value.updateExecution(executionId, {
        output: error instanceof Error ? error.message : 'Command execution failed',
        status: 'error'
      });
    }
  } finally {
    executing.value = false;
  }
};

const updateCommandOutput = (output: string) => {
  if (lastCommand.value) {
    lastCommand.value.output = output;
  }
};

const viewDevice = (device: Device) => {
  selectedDevice.value = device;
  showDeviceDetailsDialog.value = true;
};

const handleDeviceDetailsRunCommand = () => {
  if (selectedDevice.value) {
    showDeviceDetailsDialog.value = false;
    runCommand(selectedDevice.value);
  }
};

const handleDeviceDetailsDelete = (device: Device) => {
  showDeviceDetailsDialog.value = false;
  deleteDevice(device);
};

const deleteDevice = (device: Device) => {
  selectedDevice.value = device;
  deleteDeviceDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedDevice.value) return;

  try {
    deleting.value = true;
    await restClient.delete(`${API_URL}/agents/${selectedDevice.value.agent_id}/`);
    await fetchDevices();
    deleteDeviceDialog.value = false;
    toastService.showSuccess('Device deleted successfully');
  } catch (error) {
    console.error('Failed to delete device:', error);
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
