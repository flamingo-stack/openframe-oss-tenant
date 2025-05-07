<template>
  <div class="rac-devices">
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

      <UnifiedDeviceTable :devices="devices" moduleType="rac" :loading="loading" emptyIcon="pi pi-desktop"
        emptyTitle="No Devices Found" emptyMessage="Add your first device to start monitoring."
        emptyHint="Devices will appear here once they are added to your MeshCentral server." @runCommand="runCommand"
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
    <DeviceDetailsSlider v-model:visible="showDeviceDetails" :device="selectedDevice" moduleType="rac"
      @refreshDevice="fetchDevices" @remoteAccess="remoteAccess" @fileTransfer="fileTransfer"
      @deleteDevice="deleteDevice" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "@vue/runtime-core";
import { useRouter } from 'vue-router';
import { OFButton } from '../../components/ui';
import Dialog from 'primevue/dialog';
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import CommandDialog from '../../components/shared/CommandDialog.vue';
import ScriptExecutionHistory from '../../components/shared/ScriptExecutionHistory.vue';
import UnifiedDeviceTable from '../../components/shared/UnifiedDeviceTable.vue';
import DeviceDetailsSlider from '../../components/shared/DeviceDetailsSlider.vue';
import { UnifiedDevice, getOriginalDevice } from '../../types/device';
import { RACDevice, convertDevices } from '../../utils/deviceAdapters';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();

const loading = ref(true);
const devices = ref<RACDevice[]>([]);
const showRunCommandDialog = ref(false);
const deleteDeviceDialog = ref(false);
const executing = ref(false);
const deleting = ref(false);

const selectedDevice = ref<UnifiedDevice | null>(null);
const lastCommand = ref<{ cmd: string; output: string } | null>(null);

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const showExecutionHistory = ref(false);
const executionHistoryRef = ref<InstanceType<typeof ScriptExecutionHistory> | null>(null);

const showDeviceDetails = ref(false);

const fetchDevices = async () => {
  try {
    loading.value = true;

    devices.value = await restClient.get<RACDevice[]>(`${API_URL}/api/listdevices`);
    if (!devices?.value) {
      devices.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
    devices.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchDeviceDetails = async (deviceId: string) => {
  try {
    const response = await restClient.get<any>(`${API_URL}/api/deviceinfo?id=${deviceId}`);

    // Transform the MeshCentral data to a standardized format matching RMM
    return response;
  } catch (error) {
    console.error('Failed to fetch device details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device details';
    toastService.showError(errorMessage);
    return null;
  }
};

const runCommand = (device: UnifiedDevice) => {
  selectedDevice.value = device;
  showRunCommandDialog.value = true;
};

const executeCommand = async (cmd: string, shell: string, timeout: number, runAsUser: boolean) => {
  if (!selectedDevice.value) return;

  // Get device ID - try originalId first, then fall back to original device
  let deviceId: string = '';

  if ('originalId' in selectedDevice.value && selectedDevice.value.originalId) {
    deviceId = selectedDevice.value.originalId as string;
  } else {
    // Get original device data to extract ID
    const originalDevice = getOriginalDevice<RACDevice>(selectedDevice.value);
    deviceId = (originalDevice._id || originalDevice.id || '') as string;
  }

  if (!deviceId) {
    toastService.showError('Device ID not available');
    return;
  }

  let executionId: string | undefined;

  // Add command to execution history with pending status and close dialog immediately
  if (executionHistoryRef.value) {
    executionId = executionHistoryRef.value.addExecution({
      deviceName: selectedDevice.value.hostname,
      command: cmd,
      output: 'Executing command...',
      status: 'pending',
      agent_id: deviceId
    });
  }

  // Close dialog and show history immediately
  showRunCommandDialog.value = false;
  showExecutionHistory.value = true;

  try {
    executing.value = true;

    // Determine if we should use PowerShell based on the shell parameter and platform
    const usePowerShell = shell === 'powershell' && selectedDevice.value.platform === 'windows';

    const response = await restClient.post<string>(`${API_URL}/api/runcommand`, {
      id: deviceId,
      command: cmd,
      powershell: usePowerShell
    });

    const output = response || 'No output';

    lastCommand.value = {
      cmd,
      output
    };

    // Update execution history with success status and output
    if (executionHistoryRef.value && executionId) {
      executionHistoryRef.value.updateExecution(executionId, {
        output,
        status: 'success'
      });
    }

    toastService.showSuccess('Command executed successfully');
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

const viewDevice = async (device: UnifiedDevice) => {
  try {
    // Start with the unified device for immediate display
    selectedDevice.value = device;
    showDeviceDetails.value = true;

    let agentId = device.originalId as string;
    console.log('Agent ID:', agentId);
    const refreshedDevice = await fetchDeviceDetails(agentId);
    selectedDevice.value = refreshedDevice as any;
    
  } catch (error) {
    console.error('Error viewing device details:', error);
    toastService.showError('Failed to load device details');
  }
};

const remoteAccess = async (device: UnifiedDevice) => {
  try {
    // Open the MeshCentral remote access URL in a new tab
    const racUrl = `${API_URL}/connect?id=${device.originalId}`;
    window.open(racUrl, '_blank');
  } catch (error) {
    console.error('Error initiating remote access:', error);
    toastService.showError('Failed to start remote access session');
  }
};

const fileTransfer = async (device: UnifiedDevice) => {
  try {
    // Open the MeshCentral file transfer URL in a new tab
    const fileUrl = `${API_URL}/files?id=${device.originalId}`;
    window.open(fileUrl, '_blank');
  } catch (error) {
    console.error('Error initiating file transfer:', error);
    toastService.showError('Failed to start file transfer session');
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


    await restClient.post(`${API_URL}/api/removedevice`, {
      id: selectedDevice.value.originalId
    });

    // Refresh the device list
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
