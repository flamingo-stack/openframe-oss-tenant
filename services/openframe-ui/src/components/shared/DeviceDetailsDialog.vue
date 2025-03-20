<template>
  <Dialog 
    :visible="visible"
    @update:visible="(val: boolean) => emit('update:visible', val)"
    :header="displayDevice?.hostname"
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
</template>

<script setup lang="ts">
import { ref } from '@vue/runtime-core';
import { watch, computed } from '@vue/runtime-core';
import Dialog from 'primevue/dialog';
import { OFButton } from '../../components/ui';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import { restClient } from '../../apollo/apolloClient';
import { ToastService } from '../../services/ToastService';
import { ConfigService } from '../../config/config.service';

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
</style>  