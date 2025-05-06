<template>
  <Dialog 
    :visible="visible"
    @update:visible="(val: boolean) => emit('update:visible', val)"
    :header="displayDevice?.hostname || displayDevice?.name"
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div v-if="displayDevice" class="grid">
      <!-- Device Status -->
      <div class="col-12">
        <div class="flex align-items-center justify-content-between mb-3">
          <div class="flex align-items-center gap-3">
            <i :class="getDeviceIcon(displayDevice.plat)" class="text-xl"></i>
            <div class="flex gap-2">
              <Tag :value="formatPlatform(displayDevice.plat)" :severity="getPlatformSeverity(displayDevice.plat)" class="status-tag" />
              <Tag :value="displayDevice.status" :severity="getStatusSeverity(displayDevice.status)" class="status-tag" />
            </div>
          </div>
          <div class="flex gap-2">
            <OFButton 
              icon="pi pi-history" 
              class="p-button-text p-button-sm" 
              v-tooltip.top="'View History'"
              @click="showHistoryDialog = true"
            />
            <OFButton 
              icon="pi pi-code" 
              class="p-button-text p-button-sm" 
              v-tooltip.top="'Run Command'"
              @click="onRunCommand"
            />
            <OFButton 
              icon="pi pi-trash" 
              class="p-button-text p-button-sm p-button-danger" 
              v-tooltip.top="'Delete Device'"
              @click="onDelete"
            />
          </div>
        </div>
      </div>

      <!-- Tabs - Only show tabs if MeshCentral data is available -->
      <div v-if="isMeshCentralData" class="col-12">
        <div class="card p-0 mb-3">
          <TabView v-model:activeIndex="activeTabIndex" class="device-tabs">
            <TabPanel header="Overview" leftIcon="pi pi-home">
              <div class="grid">
                <!-- System Information -->
                <div class="col-12 md:col-6">
                  <div class="surface-card p-3 border-round">
                    <h3 class="text-lg font-semibold mb-3">System Information</h3>
                    <div class="grid">
                      <div class="col-12">
                        <span class="text-sm text-500">Agent ID</span>
                        <p class="text-base m-0 word-break-all">{{ displayDevice.agent_id }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Operating System</span>
                        <p class="text-base m-0">{{ displayDevice.operating_system || 'Unknown' }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Platform</span>
                        <p class="text-base m-0">{{ formatPlatform(displayDevice.plat) }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Last Seen</span>
                        <p class="text-base m-0">{{ formatTimestamp(displayDevice.last_seen) }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">CPU Model</span>
                        <p class="text-base m-0">{{ displayDevice.cpu_model?.[0] || 'Unknown' }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Total RAM</span>
                        <p class="text-base m-0">{{ displayDevice.total_ram }} GB</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Logged In User</span>
                        <p class="text-base m-0">{{ displayDevice.logged_in_username || 'Unknown' }}</p>
                      </div>
                      <div class="col-6">
                        <span class="text-sm text-500">Timezone</span>
                        <p class="text-base m-0">{{ displayDevice.timezone || 'Unknown' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Network Information -->
                <div class="col-12 md:col-6">
                  <div class="surface-card p-3 border-round">
                    <h3 class="text-lg font-semibold mb-3">Network Information</h3>
                    <div class="grid">
                      <div class="col-12">
                        <span class="text-sm text-500">IP Addresses</span>
                        <div class="flex flex-column gap-1">
                          <span v-for="(ip, index) in getIPv4Addresses(displayDevice.local_ips)" :key="index" class="text-base">
                            {{ ip }}
                          </span>
                          <span v-if="!getIPv4Addresses(displayDevice.local_ips).length" class="text-base">N/A</span>
                        </div>
                      </div>
                      <div class="col-12">
                        <span class="text-sm text-500">Public IP</span>
                        <p class="text-base m-0">{{ displayDevice.public_ip || 'N/A' }}</p>
                      </div>
                      <div class="col-12">
                        <span class="text-sm text-500">Make/Model</span>
                        <p class="text-base m-0">{{ displayDevice.make_model || 'N/A' }}</p>
                      </div>
                      <div class="col-12">
                        <span class="text-sm text-500">Serial Number</span>
                        <p class="text-base m-0">{{ displayDevice.wmi_detail?.serialnumber || 'N/A' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Storage Information -->
                <div class="col-12">
                  <div class="surface-card p-3 border-round">
                    <h3 class="text-lg font-semibold mb-3">Storage Information</h3>
                    <div class="grid">
                      <div v-for="(disk, index) in displayDevice.physical_disks" :key="index" class="col-12">
                        <div class="p-2 border-round surface-ground mb-2">
                          <div class="flex align-items-center justify-content-between">
                            <div class="flex align-items-center">
                              <i class="pi pi-database mr-2"></i>
                              <span class="text-base">{{ disk.split(' ').slice(0, -1).join(' ') }}</span>
                            </div>
                            <span class="text-base font-semibold">{{ disk.split(' ').pop() }}</span>
                          </div>
                        </div>
                      </div>
                      <div v-if="displayDevice.disks?.length" class="col-12">
                        <h4 class="text-base font-semibold mt-3 mb-2">Volumes</h4>
                        <div class="grid">
                          <div v-for="(volume, idx) in getUniqueDisks(displayDevice.disks)" :key="idx" class="col-12 md:col-4">
                            <div class="p-2 border-round surface-ground">
                              <div class="flex justify-content-between align-items-center mb-2">
                                <span class="text-sm font-semibold">{{ volume.device }}</span>
                                <span class="text-sm">{{ volume.fstype }}</span>
                              </div>
                              <div class="flex justify-content-between align-items-center">
                                <span class="text-sm">Used: {{ volume.used }}</span>
                                <span class="text-sm">Free: {{ volume.free }}</span>
                              </div>
                              <div class="mt-2">
                                <ProgressBar :value="volume.percent" :showValue="false" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
            
            <TabPanel header="Hardware" leftIcon="pi pi-server">
              <div class="surface-card p-3 border-round">
                <h3 class="text-lg font-semibold mb-3">Hardware Information</h3>
                
                <!-- Motherboard Section -->
                <div v-if="displayDevice.meshcentral_data?.motherboard" class="mb-4">
                  <h4 class="text-base font-medium mb-2">Motherboard</h4>
                  <div class="grid">
                    <div v-for="(value, key) in displayDevice.meshcentral_data.motherboard" :key="key" class="col-12 md:col-6 mb-2">
                      <span class="text-sm text-500">{{ formatKey(key) }}</span>
                      <p class="text-base m-0">{{ value || 'N/A' }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- BIOS Section -->
                <div v-if="displayDevice.meshcentral_data?.bios" class="mb-4">
                  <h4 class="text-base font-medium mb-2">BIOS</h4>
                  <div class="grid">
                    <div v-for="(value, key) in displayDevice.meshcentral_data.bios" :key="key" class="col-12 md:col-6 mb-2">
                      <span class="text-sm text-500">{{ formatKey(key) }}</span>
                      <p class="text-base m-0">{{ value || 'N/A' }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Memory Section -->
                <div v-if="displayDevice.meshcentral_data?.memory" class="mb-4">
                  <h4 class="text-base font-medium mb-2">Memory</h4>
                  <div v-for="(slot, slotName) in displayDevice.meshcentral_data.memory" :key="slotName" class="p-2 border-round surface-ground mb-2">
                    <h5 class="text-sm font-medium m-0 mb-2">{{ formatKey(slotName) }}</h5>
                    <div class="grid">
                      <div v-for="(value, key) in slot" :key="key" class="col-12 md:col-6">
                        <span class="text-sm text-500">{{ formatKey(key) }}</span>
                        <p class="text-base m-0">{{ value || 'N/A' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
            
            <TabPanel header="Network" leftIcon="pi pi-wifi">
              <div class="surface-card p-3 border-round">
                <h3 class="text-lg font-semibold mb-3">Network Interfaces</h3>
                
                <div v-if="displayDevice.meshcentral_data?.networking" class="mb-4">
                  <div v-for="(iface, ifaceName) in displayDevice.meshcentral_data.networking" :key="ifaceName" class="p-2 border-round surface-ground mb-3">
                    <h4 class="text-base font-medium mb-2">{{ ifaceName }}</h4>
                    <div class="grid">
                      <div v-for="(value, key) in iface" :key="key" class="col-12">
                        <span class="text-sm text-500">{{ formatKey(key) }}</span>
                        <p class="text-base m-0">{{ value || 'N/A' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
            
            <TabPanel header="Agent" leftIcon="pi pi-cog">
              <div class="surface-card p-3 border-round">
                <h3 class="text-lg font-semibold mb-3">Mesh Agent Information</h3>
                
                <div v-if="displayDevice.meshcentral_data?.mesh_agent" class="mb-4">
                  <div class="grid">
                    <div v-for="(value, key) in displayDevice.meshcentral_data.mesh_agent" :key="key" class="col-12 md:col-6 mb-2">
                      <span class="text-sm text-500">{{ formatKey(key) }}</span>
                      <p class="text-base m-0">{{ value || 'N/A' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>

      <!-- Main content for non-MeshCentral devices -->
      <template v-if="!isMeshCentralData">
        <!-- System Information -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-3 border-round">
            <h3 class="text-lg font-semibold mb-3">System Information</h3>
            <div class="grid">
              <div class="col-12">
                <span class="text-sm text-500">Agent ID</span>
                <p class="text-base m-0 word-break-all">{{ displayDevice.agent_id }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Operating System</span>
                <p class="text-base m-0">{{ displayDevice.operating_system || 'Unknown' }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Platform</span>
                <p class="text-base m-0">{{ formatPlatform(displayDevice.plat) }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Last Seen</span>
                <p class="text-base m-0">{{ formatTimestamp(displayDevice.last_seen) }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">CPU Model</span>
                <p class="text-base m-0">{{ displayDevice.cpu_model?.[0] || 'Unknown' }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Total RAM</span>
                <p class="text-base m-0">{{ displayDevice.total_ram }} GB</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Logged In User</span>
                <p class="text-base m-0">{{ displayDevice.logged_in_username || 'Unknown' }}</p>
              </div>
              <div class="col-6">
                <span class="text-sm text-500">Timezone</span>
                <p class="text-base m-0">{{ displayDevice.timezone || 'Unknown' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Network Information -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-3 border-round">
            <h3 class="text-lg font-semibold mb-3">Network Information</h3>
            <div class="grid">
              <div class="col-12">
                <span class="text-sm text-500">IP Addresses</span>
                <div class="flex flex-column gap-1">
                  <span v-for="(ip, index) in getIPv4Addresses(displayDevice.local_ips)" :key="index" class="text-base">
                    {{ ip }}
                  </span>
                  <span v-if="!getIPv4Addresses(displayDevice.local_ips).length" class="text-base">N/A</span>
                </div>
              </div>
              <div class="col-12">
                <span class="text-sm text-500">Public IP</span>
                <p class="text-base m-0">{{ displayDevice.public_ip || 'N/A' }}</p>
              </div>
              <div class="col-12">
                <span class="text-sm text-500">Make/Model</span>
                <p class="text-base m-0">{{ displayDevice.make_model || 'N/A' }}</p>
              </div>
              <div class="col-12">
                <span class="text-sm text-500">Serial Number</span>
                <p class="text-base m-0">{{ displayDevice.wmi_detail?.serialnumber || 'N/A' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Storage Information -->
        <div class="col-12">
          <div class="surface-card p-3 border-round">
            <h3 class="text-lg font-semibold mb-3">Storage Information</h3>
            <div class="grid">
              <div v-for="(disk, index) in displayDevice.physical_disks" :key="index" class="col-12">
                <div class="p-2 border-round surface-ground mb-2">
                  <div class="flex align-items-center justify-content-between">
                    <div class="flex align-items-center">
                      <i class="pi pi-database mr-2"></i>
                      <span class="text-base">{{ disk.split(' ').slice(0, -1).join(' ') }}</span>
                    </div>
                    <span class="text-base font-semibold">{{ disk.split(' ').pop() }}</span>
                  </div>
                </div>
              </div>
              <div v-if="displayDevice.disks?.length" class="col-12">
                <h4 class="text-base font-semibold mt-3 mb-2">Volumes</h4>
                <div class="grid">
                  <div v-for="(volume, idx) in getUniqueDisks(displayDevice.disks)" :key="idx" class="col-12 md:col-4">
                    <div class="p-2 border-round surface-ground">
                      <div class="flex justify-content-between align-items-center mb-2">
                        <span class="text-sm font-semibold">{{ volume.device }}</span>
                        <span class="text-sm">{{ volume.fstype }}</span>
                      </div>
                      <div class="flex justify-content-between align-items-center">
                        <span class="text-sm">Used: {{ volume.used }}</span>
                        <span class="text-sm">Free: {{ volume.free }}</span>
                      </div>
                      <div class="mt-2">
                        <ProgressBar :value="volume.percent" :showValue="false" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-content-end">
        <OFButton 
          label="Close" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="onClose"
        />
      </div>
    </template>
  </Dialog>
  
  <!-- Results Dialog for displaying script execution history -->
  <OFDialog
    v-if="showHistoryDialog"
    v-model="showHistoryDialog"
    :header="`History for ${displayDevice?.hostname}`"
    width="60vw"
  >
    <ModuleTable
      :items="deviceHistory"
      :loading="historyLoading"
      :searchFields="['command', 'username', 'type', 'time', 'script_name']"
      emptyTitle="No History Items"
      emptyMessage="No history items are available for this device."
      emptyHint="History items will appear here as commands and scripts are executed."
    >
      <Column field="time" header="Time" sortable>
        <template #body="{ data }">
          {{ formatTime(data.time) }}
        </template>
      </Column>
      <Column field="type" header="Type" sortable>
        <template #body="{ data }">
          <Tag :value="formatType(data.type)" :severity="getTypeSeverity(data.type)" />
        </template>
      </Column>
      <Column field="command" header="Command/Script" sortable>
        <template #body="{ data }">
          {{ data.script_name || data.command }}
        </template>
      </Column>
      <Column field="username" header="User" sortable />
      <Column header="Actions">
        <template #body="{ data }">
          <div class="flex gap-2 justify-content-end">
            <OFButton
              icon="pi pi-eye"
              class="p-button-text p-button-sm"
              v-tooltip.top="'View Output'"
              @click="showOutputDialog(data)"
            />
          </div>
        </template>
      </Column>
    </ModuleTable>
  </OFDialog>
  
  <!-- Output Dialog -->
  <OFDialog
    v-if="selectedHistoryItem"
    v-model="showOutputDialogVisible"
    :header="getDialogTitle()"
    width="60vw"
  >
    <div v-if="selectedHistoryItem.type === 'cmd_run'" class="mb-4">
      <div class="of-form-group">
        <label>Command</label>
        <div class="code-block">
          <code>{{ selectedHistoryItem.command }}</code>
        </div>
      </div>
      <div class="of-form-group">
        <label>Output</label>
        <div class="code-block">
          <pre>{{ selectedHistoryItem.results || 'No output' }}</pre>
        </div>
      </div>
    </div>

    <div v-else-if="selectedHistoryItem.type === 'script_run'" class="mb-4">
      <div class="of-form-group">
        <label>Script</label>
        <div class="code-block">
          <code>{{ selectedHistoryItem.script_name }}</code>
        </div>
      </div>
      <div v-if="selectedHistoryItem.script_results" class="of-form-group">
        <label>Output</label>
        <div class="code-block">
          <pre>{{ selectedHistoryItem.script_results.stdout || 'No stdout output' }}</pre>
        </div>
      </div>
      <div v-if="selectedHistoryItem.script_results && selectedHistoryItem.script_results.stderr" class="of-form-group">
        <label>Error</label>
        <div class="code-block error">
          <pre>{{ selectedHistoryItem.script_results.stderr }}</pre>
        </div>
      </div>
      <div v-if="selectedHistoryItem.script_results" class="of-form-group">
        <label>Execution Details</label>
        <div class="execution-details">
          <div class="detail-item">
            <div class="detail-label">Exit Code</div>
            <div class="detail-value">{{ selectedHistoryItem.script_results.retcode }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Execution Time</div>
            <div class="detail-value">{{ selectedHistoryItem.script_results.execution_time.toFixed(2) }} sec</div>
          </div>
        </div>
      </div>
    </div>
  </OFDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from '@vue/runtime-core';
import Dialog from 'primevue/dialog';
import { OFButton, OFDialog, Column } from '../../components/ui';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import TabMenu from 'primevue/tabmenu';
import { restClient } from '../../apollo/apolloClient';
import { ToastService } from '../../services/ToastService';
import { ConfigService } from '../../config/config.service';
import ModuleTable from './ModuleTable.vue';
import { HistoryEntry } from '../../types/rmm';

interface Disk {
  free: string;
  used: string;
  total: string;
  device: string;
  fstype: string;
  percent: number;
}

interface WmiDetail {
  cpus: string[];
  gpus: string[];
  disks: string[];
  local_ips: string[];
  make_model: string;
  serialnumber: string;
}

interface Device {
  agent_id: string;
  hostname: string;
  plat: string;
  operating_system: string;
  status: string;
  last_seen: string;
  public_ip: string;
  local_ips: string;
  cpu_model: string[];
  total_ram: number;
  logged_in_username: string;
  timezone: string;
  make_model: string;
  wmi_detail: WmiDetail;
  disks: Disk[];
  physical_disks: string[];
  monitoring_type?: string;
  description?: string;
  overdue_email_alert?: boolean;
  overdue_text_alert?: boolean;
  overdue_dashboard_alert?: boolean;
  offline_time?: number;
  overdue_time?: number;
  check_interval?: number;
  time_zone?: string;
  site?: number;
  custom_fields?: any[];
  winupdatepolicy?: any[];
  meshcentral_data?: any;
}

interface WinUpdatePolicy {
  id: number;
  created_by: string | null;
  created_time: string;
  modified_by: string | null;
  modified_time: string;
  critical: string;
  important: string;
  moderate: string;
  low: string;
  other: string;
  run_time_hour: number;
  run_time_frequency: string;
  run_time_days: number[];
  run_time_day: number;
  reboot_after_install: string;
  reprocess_failed_inherit: boolean;
  reprocess_failed: boolean;
  reprocess_failed_times: number;
  email_if_fail: boolean;
  agent: number;
  policy: number | null;
}

interface CustomField {
  name: string;
  value: string;
}

interface EditFormData {
  agent_id: string;
  monitoring_type: string;
  description: string;
  overdue_email_alert: boolean;
  overdue_text_alert: boolean;
  overdue_dashboard_alert: boolean;
  offline_time: number;
  overdue_time: number;
  check_interval: number;
  time_zone: string | null;
  site: number;
  custom_fields: CustomField[];
  winupdatepolicy: WinUpdatePolicy[];
}

const props = defineProps<{
  visible: boolean;
  device: Device | null;
  showEditOnMount?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'runCommand'): void;
  (e: 'delete'): void;
}>();

const showEditDialog = ref(false);
const showHistoryDialog = ref(false);
const showOutputDialogVisible = ref(false);
const selectedHistoryItem = ref<HistoryEntry | null>(null);
const deviceHistory = ref<HistoryEntry[]>([]);
const historyLoading = ref(false);
const historyRefreshInterval = ref<number | null>(null);
const previousDeviceHistory = ref<HistoryEntry[]>([]);
const toastService = ToastService.getInstance();
const loading = ref(false);
const detailedDevice = ref<Device | null>(null);

const configService = ConfigService.getInstance();
const fetchDeviceDetails = async () => {
  if (!props.device?.agent_id) return;
  
  loading.value = true;
  try {
    const response = await restClient.get(`${configService.getConfig().gatewayUrl}/tools/tactical-rmm/agents/${props.device.agent_id}/`) as Device;
    detailedDevice.value = response;
  } catch (err: any) {
    toastService.showError(err.message);
  } finally {
    loading.value = false;
  }
};

// Update the watch handler
watch(() => props.visible, async (newValue: boolean) => {
  if (newValue) {
    await fetchDeviceDetails();
    if (props.showEditOnMount) {
      showEditDialog.value = true;
    }
  } else {
    showEditDialog.value = false;
    detailedDevice.value = null;
  }
});

// Update the template to use detailedDevice when available
const displayDevice = computed(() => detailedDevice.value || props.device);

const timezoneOptions = [
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  // Add more timezone options as needed
];

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

  // Split the IPs string into an array and clean up each IP
  return ips.split(',')
    .map(ip => ip.trim())
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

const getUniqueDisks = (disks: any[]) => {
  if (!disks) return [];
  
  // Filter out disks with 0 total space and map auto_home
  const validDisks = disks.filter(disk => 
    disk.total !== '0 B' && 
    !disk.device.includes('map auto_home')
  );

  // Remove duplicates based on device name
  const uniqueDisks = validDisks.filter((disk, index, self) =>
    index === self.findIndex(d => d.device === disk.device)
  );

  return uniqueDisks;
};

const onClose = () => {
  emit('update:visible', false);
};

const onRunCommand = () => {
  emit('runCommand');
  onClose();
};

const onDelete = () => {
  emit('delete');
  onClose();
};

// Format time for display
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

// Format type for display
const formatType = (type: string) => {
  return type === 'cmd_run' ? 'Command' : 'Script';
};

// Get severity for type tag
const getTypeSeverity = (type: string) => {
  return type === 'cmd_run' ? 'info' : 'success';
};

// Get dialog title based on history item type
const getDialogTitle = () => {
  if (!selectedHistoryItem.value) return 'Output Details';
  
  if (selectedHistoryItem.value.type === 'cmd_run') {
    return 'Command Output';
  } else {
    return `Script Output: ${selectedHistoryItem.value.script_name}`;
  }
};

// Show output dialog for a history item
const showOutputDialog = (historyItem: HistoryEntry) => {
  selectedHistoryItem.value = historyItem;
  showOutputDialogVisible.value = true;
};

// Fetch history data for the device
const fetchDeviceHistory = async () => {
  const deviceId = displayDevice.value && 'agent_id' in displayDevice.value ? displayDevice.value.agent_id : null;
  if (!deviceId) return;
  
  try {
    historyLoading.value = true;
    
    // For local development, use mock data
    if (window.location.hostname === 'localhost' && window.location.port === '5177') {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          time: "2025-03-21T22:50:22.974500Z",
          type: "cmd_run",
          command: "echo \"dsaads\"",
          username: "tactical",
          results: "dsaads",
          script_results: null,
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          script: null,
          custom_field: null
        },
        {
          id: 2,
          time: "2025-03-21T22:54:01.921251Z",
          type: "script_run",
          command: "",
          username: "tactical",
          results: null,
          script_results: {
            id: 2,
            stderr: "usage: trmm4166938497 [-h] [--no-download] [--no-upload] [--single] [--bytes]\n                      [--share] [--simple] [--csv]\n                      [--csv-delimiter CSV_DELIMITER] [--csv-header] [--json]\n                      [--list] [--server SERVER] [--exclude EXCLUDE]\n                      [--mini MINI] [--source SOURCE] [--timeout TIMEOUT]\n                      [--secure] [--no-pre-allocate] [--version]\ntrmm4166938497: error: unrecognized arguments: dsadadas\n",
            stdout: "",
            retcode: 0,
            execution_time: 0.371898875
          },
          script_name: "Network - Speed Test",
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          script: 14,
          custom_field: null
        }
      ];
      
      // Check if data has changed before updating
      if (JSON.stringify(mockHistory) !== JSON.stringify(previousDeviceHistory.value)) {
        deviceHistory.value = mockHistory;
        previousDeviceHistory.value = JSON.parse(JSON.stringify(mockHistory));
      }
      
      historyLoading.value = false;
      return;
    }
    
    const runtimeConfig = configService.getConfig();
    const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
    const response = await restClient.get<HistoryEntry[]>(`${API_URL}/agents/${deviceId}/history/`);
    const newHistory = Array.isArray(response) ? response : [];
    
    // Only update the UI if data has changed
    if (JSON.stringify(newHistory) !== JSON.stringify(previousDeviceHistory.value)) {
      deviceHistory.value = newHistory;
      previousDeviceHistory.value = JSON.parse(JSON.stringify(newHistory));
    }
  } catch (error) {
    console.error('Failed to fetch device history:', error);
    toastService.showError('Failed to fetch device history');
  } finally {
    historyLoading.value = false;
  }
};

// Set up the history refresh interval when the history dialog is opened
watch(showHistoryDialog, (newValue) => {
  if (newValue) {
    // Fetch history immediately
    fetchDeviceHistory();
    
    // Set up refresh interval
    if (historyRefreshInterval.value) {
      clearInterval(historyRefreshInterval.value);
    }
    
    historyRefreshInterval.value = window.setInterval(() => {
      fetchDeviceHistory();
    }, 1000);
  } else {
    // Clean up interval when dialog is closed
    if (historyRefreshInterval.value) {
      clearInterval(historyRefreshInterval.value);
      historyRefreshInterval.value = null;
    }
  }
});

// Clean up interval when component is unmounted
onUnmounted(() => {
  if (historyRefreshInterval.value) {
    clearInterval(historyRefreshInterval.value);
    historyRefreshInterval.value = null;
  }
});

// Determine if the device data is from MeshCentral
const isMeshCentralData = computed(() => {
  return displayDevice.value && 'meshcentral_data' in displayDevice.value;
});

// Tab Menu items
const activeTabIndex = ref(0);
const tabItems = computed(() => [
  { label: 'Overview', icon: 'pi pi-home' },
  { label: 'Hardware', icon: 'pi pi-server' },
  { label: 'Network', icon: 'pi pi-wifi' },
  { label: 'Agent', icon: 'pi pi-cog' }
]);

// Format keys for display
const formatKey = (key: string) => {
  // Replace underscores with spaces and capitalize each word
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    // Handle other formats like 'IPv4 Layer'
    .replace(/([A-Z])/g, ' $1')
    .trim();
};
</script>

<style scoped>
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

.surface-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-color);
  }
}

:deep(.p-progressbar) {
  height: 0.5rem;
  background: var(--surface-ground);
  border-radius: 0.25rem;
  overflow: hidden;

  .p-progressbar-value {
    background: var(--primary-color);
    transition: width 0.3s ease;
  }
}

.word-break-all {
  word-break: break-all;
}

:deep(.p-button.p-button-sm) {
  width: 2rem;
  height: 2rem;
  padding: 0;

  .p-button-icon {
    font-size: 1rem;
  }
}

:deep(.status-tag) {
  min-width: 75px;
  justify-content: center;
}

:deep(.p-tag) {
  text-transform: capitalize;
}

.of-form-group {
  margin-bottom: 1.5rem;
}

.of-form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 600;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  transition: all 0.2s;
}

.code-block code,
.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--font-family-monospace, monospace);
  font-size: 0.875rem;
}

.code-block.error {
  background: var(--surface-ground);
  border-color: var(--red-100);
  color: var(--text-color);
}

.code-block.error code,
.code-block.error pre {
  color: var(--text-color);
}

.execution-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.detail-item {
  min-width: 150px;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 600;
  font-size: 0.875rem;
}
</style>                                    