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

      <UnifiedDeviceTable :devices="devices" moduleType="rmm" :loading="loading" emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found" emptyMessage="Add your first device to start monitoring."
        emptyHint="Devices will appear here once they are added to your RMM server." @runCommand="runCommand"
        @viewDetails="viewDevice" @deleteDevice="deleteDevice" />
    </div>

    <!-- Run Command Dialog -->
    <CommandDialog v-model:visible="showRunCommandDialog" :loading="executing" :lastCommand="lastCommand"
      :devicePlatform="selectedDevice?.platform || selectedDevice?.moduleSpecific?.plat" @run="executeCommand"
      @update:output="updateCommandOutput" @cancel="showRunCommandDialog = false" />

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
    <ScriptExecutionHistory v-model:visible="showExecutionHistory" ref="executionHistoryRef" />

    <!-- Device Details Slider -->
    <DeviceDetailsSlider v-model:visible="showDeviceDetails" :device="selectedDevice" moduleType="rmm"
      @refreshDevice="fetchDevices" @runCommand="onRunCommand" @rebootDevice="rebootDevice"
      @deleteDevice="deleteDevice" />
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
import UnifiedDeviceTable from '../../components/shared/UnifiedDeviceTable.vue';
import DeviceDetailsSlider from '../../components/shared/DeviceDetailsSlider/index.vue';
import type { Device, CommandResponse, DeviceResponse } from '../../types/rmm';
import { UnifiedDevice, getOriginalDevice, EnhancedUnifiedDevice } from '../../types/device';
import { RMMDevice, convertDevices } from '../../utils/deviceAdapters';
import { getDeviceIcon, formatPlatform, getPlatformSeverity } from '../../utils/deviceUtils';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<RMMDevice[]>([]);
const showRunCommandDialog = ref(false);
const deleteDeviceDialog = ref(false);
const executing = ref(false);
const deleting = ref(false);

const selectedDevice = ref<UnifiedDevice | null>(null);
const command = ref('');
const lastCommand = ref<{ cmd: string; output: string } | null>(null);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const showExecutionHistory = ref(false);
const executionHistoryRef = ref<InstanceType<typeof ScriptExecutionHistory> | null>(null);

const showDeviceDetails = ref(false);
const showCreateDialog = ref(false);
const showCommandDialog = ref(false);

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

    const response = await restClient.get<RMMDevice[]>(`${API_URL}/agents/`);

    // Store original RMM devices for reference
    devices.value = Array.isArray(JSON.parse(response)) ? JSON.parse(response) : [];

  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
    devices.value = [];
  } finally {
    loading.value = false;
  }
};


const runCommand = (device: UnifiedDevice) => {
  selectedDevice.value = device;
  showRunCommandDialog.value = true;
};

const executeCommand = async (cmd: string, shell: string, timeout: number, runAsUser: boolean) => {
  if (!selectedDevice.value)
    return;

  let agentId: string | undefined;
  agentId = selectedDevice.value.originalId as string;
  let executionId: string | undefined;
  // Add command to execution history with pending status and close dialog immediately
  if (executionHistoryRef.value) {
    executionId = executionHistoryRef.value.addExecution({
      deviceName: selectedDevice.value.hostname,
      command: cmd,
      output: 'Executing command...',
      status: 'pending',
      agent_id: agentId
    });
  }

  // Close dialog and show history immediately
  showRunCommandDialog.value = false;
  showExecutionHistory.value = true;

  try {
    executing.value = true;

    // Determine shell based on platform and shell type
    let shellPath = '/bin/bash';
    if (selectedDevice.value.platform === 'windows') {
      shellPath = shell === 'powershell' ? 'powershell' : 'cmd';
    } else if (selectedDevice.value.platform === 'darwin' || selectedDevice.value.platform === 'linux') {
      shellPath = '/bin/bash';
    }

    const response = await restClient.post<string>(`${API_URL}/agents/${agentId}/cmd/`, {
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
        (error as { data: string }).data : 'Failed to execute command');
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

const fetchDeviceDetails = async (deviceId: string) => {
  try {
    const response = await restClient.get<RMMDevice>(`${API_URL}/agents/${deviceId}/`);
    return response || null;
  } catch (error) {
    console.error('Failed to fetch device details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device details';
    toastService.showError(errorMessage);
    return null;
  }
};

const viewDevice = async (device: UnifiedDevice) => {
  try {
    selectedDevice.value = device;
    showDeviceDetails.value = true;

    const refreshedDevice = await fetchDeviceDetails(device.originalId as string);
    selectedDevice.value = refreshedDevice as any;
  } catch (error) {
    console.error('Error viewing device details:', error);
    toastService.showError('Failed to load device details');
  }
};

const deleteDevice = (device: UnifiedDevice) => {
  selectedDevice.value = device;
  deleteDeviceDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedDevice.value) return;

  try {
    deleting.value = true;

    // Get agent ID - try originalId first, then fall back to original device
    let agentId: string;

    if ('originalId' in selectedDevice.value && selectedDevice.value.originalId) {
      agentId = selectedDevice.value.originalId as string;
    } else {
      // Get the original RMM device to extract agent_id
      const originalDevice = getOriginalDevice<RMMDevice>(selectedDevice.value);
      agentId = originalDevice.agent_id;
    }

    if (!agentId) {
      toastService.showError('Agent ID not available');
      return;
    }

    await restClient.delete(`${API_URL}/agents/${agentId}/`);
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

const onRunCommand = (device: UnifiedDevice) => {
  runCommand(device);
};

const rebootDevice = async (device: UnifiedDevice) => {
  try {
    let agentId: string | undefined;

    if ('originalId' in device && device.originalId) {
      agentId = device.originalId as string;
    } else {
      const originalDevice = getOriginalDevice<RMMDevice>(device);
      agentId = originalDevice.agent_id;
    }

    if (!agentId) {
      toastService.showError('Agent ID not available');
      return;
    }

    await restClient.post(`${API_URL}/agents/${agentId}/reboot/`);
    toastService.showSuccess('Reboot command sent successfully');
  } catch (error) {
    console.error('Error rebooting device:', error);
    toastService.showError('Failed to reboot device');
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
