<template>
  <div class="device-details-slider">
    <div v-if="visible" class="sidebar-mask active" @click="onVisibilityChange(false)"></div>
    <div class="sidebar" :class="{ 'active': visible }">
      <div class="sidebar-header">
        <div class="flex align-items-center">
          <i :class="unifiedDevice ? (unifiedDevice.icon || 'pi pi-desktop') : 'pi pi-desktop'"
            class="mr-2 text-xl"></i>
          <h3 class="text-xl m-0">{{ unifiedDevice ? (unifiedDevice.displayName || unifiedDevice.hostname) : 'Device Details' }}</h3>
        </div>
        <div class="flex gap-2">
          <!-- Action buttons moved to header -->
          <template v-if="unifiedDevice">
            <!-- Common actions -->
            <OFButton icon="pi pi-refresh" class="p-button-text p-button-rounded" v-tooltip.top="'Refresh Device'"
              @click="$emit('refreshDevice', unifiedDevice)" />

            <!-- MDM specific actions -->
            <template v-if="unifiedDevice.type === 'mdm'">
              <OFButton icon="pi pi-lock" class="p-button-text p-button-rounded" v-tooltip.top="'Lock Device'"
                :disabled="!unifiedDevice.moduleSpecific?.mdm?.enrollment_status"
                @click="$emit('lockDevice', unifiedDevice)" />
              <OFButton icon="pi pi-unlock" class="p-button-text p-button-rounded" v-tooltip.top="'Unlock Device'"
                :disabled="!unifiedDevice.moduleSpecific?.mdm?.enrollment_status"
                @click="$emit('unlockDevice', unifiedDevice)" />
              <OFButton icon="pi pi-trash" class="p-button-text p-button-rounded p-button-danger"
                v-tooltip.top="'Erase Device'" :disabled="!unifiedDevice.moduleSpecific?.mdm?.enrollment_status"
                @click="$emit('eraseDevice', unifiedDevice)" />
            </template>

            <!-- RMM specific actions -->
            <template v-if="unifiedDevice.type === 'rmm'">
              <OFButton icon="pi pi-code" class="p-button-text p-button-rounded" v-tooltip.top="'Run Command'"
                @click="$emit('runCommand', unifiedDevice)" />
              <OFButton icon="pi pi-desktop" class="p-button-text p-button-rounded" v-tooltip.top="'Reboot Device'"
                @click="$emit('rebootDevice', unifiedDevice)" />
            </template>

            <!-- RAC specific actions -->
            <template v-if="unifiedDevice.type === 'rac'">
              <OFButton icon="pi pi-desktop" class="p-button-text p-button-rounded" v-tooltip.top="'Remote Access'"
                @click="$emit('remoteAccess', unifiedDevice)" />
              <OFButton icon="pi pi-folder" class="p-button-text p-button-rounded" v-tooltip.top="'File Transfer'"
                @click="$emit('fileTransfer', unifiedDevice)" />
            </template>

            <!-- Delete action for all devices -->
            <OFButton icon="pi pi-trash" class="p-button-text p-button-rounded p-button-danger"
              v-tooltip.top="'Delete Device'" @click="$emit('deleteDevice', unifiedDevice)" />
          </template>

          <!-- Close button -->
          <OFButton icon="pi pi-times" class="p-button-text p-button-rounded" @click="onVisibilityChange(false)"
            aria-label="Close" />
        </div>
      </div>

      <div class="sidebar-content" v-if="unifiedDevice">
        <ScrollPanel class="scroll-panel">
          <div class="device-info">
            <!-- Device Overview -->
            <div class="info-section">
              <h4 class="section-title">Device Overview</h4>
              <div class="device-overview">
                <div class="grid">
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">Hostname:</span>
                    <span class="info-value">{{ unifiedDevice.hostname }}</span>
                  </div>
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">Status:</span>
                    <Tag :value="unifiedDevice.status" :severity="getStatusSeverity(unifiedDevice.status)" />
                  </div>
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">Platform:</span>
                    <Tag :value="formatPlatform(unifiedDevice.platform)"
                      :severity="getPlatformSeverity(unifiedDevice.platform)" />
                  </div>
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">OS Version:</span>
                    <span class="info-value">{{ unifiedDevice.osVersion }}</span>
                  </div>
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">Last Seen:</span>
                    <span class="info-value">{{ formatTimestamp(unifiedDevice.lastSeen) }}</span>
                  </div>
                  <div class="col-12 md:col-6 info-row">
                    <span class="info-label">Device Type:</span>
                    <Tag :value="unifiedDevice.type.toUpperCase()" severity="info" />
                  </div>
                  <!-- MDM Specific -->
                  <div class="col-12 md:col-6 info-row"
                    v-if="unifiedDevice.type === 'mdm' && unifiedDevice.moduleSpecific?.mdm?.enrollment_status">
                    <span class="info-label">MDM Status:</span>
                    <Tag :value="unifiedDevice.moduleSpecific.mdm.enrollment_status"
                      :severity="getMDMStatusSeverity(unifiedDevice.moduleSpecific.mdm.enrollment_status)" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Hardware Information -->
            <div class="info-section" v-if="unifiedDevice.hardware">
              <h4 class="section-title">Hardware Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.manufacturer">
                  <span class="info-label">Manufacturer:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.manufacturer }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.model">
                  <span class="info-label">Model:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.model }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.serialNumber">
                  <span class="info-label">Serial Number:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.serialNumber }}</span>
                </div>

                <!-- CPU Info -->
                <div class="col-12 info-row" v-if="unifiedDevice.hardware.cpu?.model">
                  <span class="info-label">CPU:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.cpu.model }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.cpu?.cores">
                  <span class="info-label">CPU Cores:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.cpu.cores }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.cpu?.logicalCores">
                  <span class="info-label">Logical Cores:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.cpu.logicalCores }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.hardware.cpu?.usage !== undefined">
                  <span class="info-label">CPU Usage:</span>
                  <span class="info-value">{{ unifiedDevice.hardware.cpu.usage }}%</span>
                </div>

                <!-- Memory Info -->
                <div class="col-12" v-if="unifiedDevice.hardware.memory">
                  <div class="memory-section mt-2 mb-2">
                    <h5 class="subsection-title">Memory</h5>
                    <div v-if="unifiedDevice.hardware.memory.total && unifiedDevice.hardware.memory.used" class="mb-2">
                      <ProgressBar
                        :value="(unifiedDevice.hardware.memory.used / unifiedDevice.hardware.memory.total) * 100" />
                    </div>
                    <div class="grid">
                      <div class="col-12 md:col-4 info-row" v-if="unifiedDevice.hardware.memory.total">
                        <span class="info-label">Total:</span>
                        <span class="info-value">{{ formatBytes(unifiedDevice.hardware.memory.total) }}</span>
                      </div>
                      <div class="col-12 md:col-4 info-row" v-if="unifiedDevice.hardware.memory.used">
                        <span class="info-label">Used:</span>
                        <span class="info-value">{{ formatBytes(unifiedDevice.hardware.memory.used) }}</span>
                      </div>
                      <div class="col-12 md:col-4 info-row" v-if="unifiedDevice.hardware.memory.free">
                        <span class="info-label">Free:</span>
                        <span class="info-value">{{ formatBytes(unifiedDevice.hardware.memory.free) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- GPU Info -->
                <div class="col-12" v-if="unifiedDevice.hardware.gpu && unifiedDevice.hardware.gpu.length > 0">
                  <div class="gpu-section mt-2 mb-2">
                    <h5 class="subsection-title">Graphics</h5>
                    <div v-for="(gpu, index) in unifiedDevice.hardware.gpu" :key="index" class="info-row">
                      <span class="info-value">{{ gpu }}</span>
                    </div>
                  </div>
                </div>

                <!-- Storage Info -->
                <div class="col-12" v-if="unifiedDevice.hardware.storage && unifiedDevice.hardware.storage.length > 0">
                  <div class="storage-section mt-2">
                    <h5 class="subsection-title">Storage</h5>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="(disk, index) in unifiedDevice.hardware.storage" :key="index"
                        class="disk-item mb-2 storage-card">
                        <div class="disk-name mb-1 text-sm">{{ disk.name || `Disk ${index + 1}` }}</div>
                        <div v-if="disk.total && disk.used" class="mb-1">
                          <ProgressBar :value="Math.round((disk.used / disk.total) * 100)" />
                        </div>
                        <div class="grid">
                          <div class="col-4 info-row">
                            <span class="info-label text-xs">Total:</span>
                            <span class="info-value text-sm">{{ formatBytes(disk.total) }}</span>
                          </div>
                          <div class="col-4 info-row">
                            <span class="info-label text-xs">Used:</span>
                            <span class="info-value text-sm">{{ formatBytes(disk.used) }}</span>
                          </div>
                          <div class="col-4 info-row">
                            <span class="info-label text-xs">Free:</span>
                            <span class="info-value text-sm">{{ formatBytes(disk.free) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Network Information -->
            <div class="info-section" v-if="unifiedDevice.network">
              <h4 class="section-title">Network Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.network.publicIp">
                  <span class="info-label">Public IP:</span>
                  <span class="info-value">{{ unifiedDevice.network.publicIp }}</span>
                </div>

                <!-- IP Addresses -->
                <div class="col-12"
                  v-if="unifiedDevice.network.ipAddresses && unifiedDevice.network.ipAddresses.length > 0">
                  <h5 class="subsection-title">IP Addresses</h5>
                  <div v-for="(ip, index) in unifiedDevice.network.ipAddresses" :key="index" class="info-row">
                    <span class="info-value">{{ ip }}</span>
                  </div>
                </div>

                <!-- MAC Addresses -->
                <div class="col-12"
                  v-if="unifiedDevice.network.macAddresses && unifiedDevice.network.macAddresses.length > 0">
                  <h5 class="subsection-title mt-2">MAC Addresses</h5>
                  <div v-for="(mac, index) in unifiedDevice.network.macAddresses" :key="index" class="info-row">
                    <span class="info-value">{{ mac }}</span>
                  </div>
                </div>

                <!-- Network Interfaces -->
                <div class="col-12"
                  v-if="unifiedDevice.network.interfaces && unifiedDevice.network.interfaces.length > 0">
                  <h5 class="subsection-title mt-2">Network Interfaces</h5>
                  <div v-for="(iface, index) in unifiedDevice.network.interfaces" :key="index"
                    class="interface-item mb-2 p-2 border-1 border-round">
                    <div class="font-bold mb-1">{{ iface.name }}</div>
                    <div class="grid">
                      <div class="col-12 md:col-6 info-row" v-if="iface.mac">
                        <span class="info-label">MAC:</span>
                        <span class="info-value">{{ iface.mac }}</span>
                      </div>
                      <div class="col-12 md:col-6 info-row" v-if="iface.status">
                        <span class="info-label">Status:</span>
                        <span class="info-value">{{ iface.status }}</span>
                      </div>
                    </div>
                    <div v-if="iface.ipv4 && iface.ipv4.length > 0">
                      <span class="info-label">IPv4:</span>
                      <div v-for="(ip, ipIndex) in iface.ipv4" :key="`${index}-v4-${ipIndex}`" class="ml-3">
                        <span class="info-value">{{ ip }}</span>
                      </div>
                    </div>
                    <div v-if="iface.ipv6 && iface.ipv6.length > 0">
                      <span class="info-label">IPv6:</span>
                      <div v-for="(ip, ipIndex) in iface.ipv6" :key="`${index}-v6-${ipIndex}`" class="ml-3">
                        <span class="info-value">{{ ip }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Operating System Information -->
            <div class="info-section" v-if="unifiedDevice.os">
              <h4 class="section-title">Operating System Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.name">
                  <span class="info-label">OS Name:</span>
                  <span class="info-value">{{ unifiedDevice.os.name }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.version">
                  <span class="info-label">OS Version:</span>
                  <span class="info-value">{{ unifiedDevice.os.version }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.build">
                  <span class="info-label">Build:</span>
                  <span class="info-value">{{ unifiedDevice.os.build }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.architecture">
                  <span class="info-label">Architecture:</span>
                  <span class="info-value">{{ unifiedDevice.os.architecture }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.lastBoot">
                  <span class="info-label">Last Boot:</span>
                  <span class="info-value">{{ formatTimestamp(unifiedDevice.os.lastBoot) }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.os.uptime !== undefined">
                  <span class="info-label">Uptime:</span>
                  <span class="info-value">{{ formatUptime(unifiedDevice.os.uptime) }}</span>
                </div>
              </div>
            </div>

            <!-- Security Information -->
            <div class="info-section" v-if="unifiedDevice.security">
              <h4 class="section-title">Security Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.security.antivirusEnabled !== undefined">
                  <span class="info-label">Antivirus:</span>
                  <Tag :value="unifiedDevice.security.antivirusEnabled ? 'Enabled' : 'Disabled'"
                    :severity="unifiedDevice.security.antivirusEnabled ? 'success' : 'danger'" />
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.security.firewallEnabled !== undefined">
                  <span class="info-label">Firewall:</span>
                  <Tag :value="unifiedDevice.security.firewallEnabled ? 'Enabled' : 'Disabled'"
                    :severity="unifiedDevice.security.firewallEnabled ? 'success' : 'danger'" />
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.security.encryptionEnabled !== undefined">
                  <span class="info-label">Disk Encryption:</span>
                  <Tag :value="unifiedDevice.security.encryptionEnabled ? 'Enabled' : 'Disabled'"
                    :severity="unifiedDevice.security.encryptionEnabled ? 'success' : 'danger'" />
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.security.lastUpdated">
                  <span class="info-label">Last Update:</span>
                  <span class="info-value">{{ formatTimestamp(unifiedDevice.security.lastUpdated) }}</span>
                </div>
              </div>

              <!-- Vulnerabilities -->
              <div v-if="unifiedDevice.security.vulnerabilities && unifiedDevice.security.vulnerabilities.length > 0">
                <h5 class="subsection-title mt-2">Vulnerabilities</h5>
                <div class="vulnerability-count mb-2">
                  <Tag :value="`${unifiedDevice.security.vulnerabilities.length} vulnerabilities found`"
                    severity="danger" />
                </div>
                <DataTable :value="unifiedDevice.security.vulnerabilities" class="p-datatable-sm"
                  responsiveLayout="scroll">
                  <Column field="cve" header="CVE"></Column>
                  <Column field="severity" header="Severity"></Column>
                  <Column field="details" header="Details"></Column>
                </DataTable>
              </div>
            </div>

            <!-- Mobile Information (for MDM devices) -->
            <div class="info-section" v-if="unifiedDevice.mobile">
              <h4 class="section-title">Mobile Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.mobile.batteryLevel !== undefined">
                  <span class="info-label">Battery Level:</span>
                  <div class="w-full">
                    <ProgressBar :value="unifiedDevice.mobile.batteryLevel" :showValue="true" />
                  </div>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.mobile.mdmEnrollmentStatus">
                  <span class="info-label">MDM Status:</span>
                  <Tag :value="unifiedDevice.mobile.mdmEnrollmentStatus"
                    :severity="getMDMStatusSeverity(unifiedDevice.mobile.mdmEnrollmentStatus)" />
                </div>
              </div>

              <!-- MDM Profiles -->
              <div v-if="unifiedDevice.mobile.profiles && unifiedDevice.mobile.profiles.length > 0">
                <h5 class="subsection-title mt-2">MDM Profiles</h5>
                <div v-for="(profile, index) in unifiedDevice.mobile.profiles" :key="index" class="info-row">
                  <span class="info-value">{{ profile.name }}</span>
                </div>
              </div>

              <!-- Location Information -->
              <div v-if="unifiedDevice.mobile.location">
                <h5 class="subsection-title mt-2">Device Location</h5>
                <div class="grid">
                  <div class="col-12 md:col-6 info-row"
                    v-if="unifiedDevice.mobile.location.latitude && unifiedDevice.mobile.location.longitude">
                    <span class="info-label">Coordinates:</span>
                    <span class="info-value">{{ unifiedDevice.mobile.location.latitude }}, {{
                      unifiedDevice.mobile.location.longitude }}</span>
                  </div>
                  <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.mobile.location.timestamp">
                    <span class="info-label">Last Update:</span>
                    <span class="info-value">{{ formatTimestamp(unifiedDevice.mobile.location.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- User Information -->
            <div class="info-section" v-if="unifiedDevice.user">
              <h4 class="section-title">User Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.user.currentUser">
                  <span class="info-label">Current User:</span>
                  <span class="info-value">{{ unifiedDevice.user.currentUser }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.user.domain">
                  <span class="info-label">Domain:</span>
                  <span class="info-value">{{ unifiedDevice.user.domain }}</span>
                </div>
              </div>

              <!-- Logged In Users -->
              <div v-if="unifiedDevice.user.loggedInUsers && unifiedDevice.user.loggedInUsers.length > 0">
                <h5 class="subsection-title mt-2">Logged In Users</h5>
                <div v-for="(user, index) in unifiedDevice.user.loggedInUsers" :key="index" class="info-row">
                  <span class="info-value">{{ user }}</span>
                </div>
              </div>
            </div>

            <!-- Management Information -->
            <div class="info-section" v-if="unifiedDevice.management">
              <h4 class="section-title">Management Information</h4>
              <div class="grid">
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.management.site">
                  <span class="info-label">Site:</span>
                  <span class="info-value">{{ unifiedDevice.management.site }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.management.group">
                  <span class="info-label">Group:</span>
                  <span class="info-value">{{ unifiedDevice.management.group }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.management.agentVersion">
                  <span class="info-label">Agent Version:</span>
                  <span class="info-value">{{ unifiedDevice.management.agentVersion }}</span>
                </div>
                <div class="col-12 md:col-6 info-row" v-if="unifiedDevice.management.lastCheckin">
                  <span class="info-label">Last Check-in:</span>
                  <span class="info-value">{{ formatTimestamp(unifiedDevice.management.lastCheckin) }}</span>
                </div>
              </div>
            </div>

            <!-- Software Information -->
            <div class="info-section" v-if="unifiedDevice.software && unifiedDevice.software.length > 0">
              <h4 class="section-title">Software Inventory</h4>
              <div class="mb-2">
                <InputText v-model="softwareFilter" placeholder="Filter software..." class="w-full" />
              </div>
              <DataTable :value="filteredSoftware" class="p-datatable-sm" :paginator="true" :rows="10"
                responsiveLayout="scroll">
                <Column field="name" header="Name"></Column>
                <Column field="version" header="Version"></Column>
                <Column field="source" header="Source"></Column>
                <Column field="installDate" header="Installed"></Column>
              </DataTable>
            </div>
          </div>
        </ScrollPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from '@vue/runtime-core';
import ScrollPanel from 'primevue/scrollpanel';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { OFButton } from '../ui';
import { autoConvertDevices, convertDevices } from '../../utils/deviceAdapters';
import { UnifiedDevice, EnhancedUnifiedDevice } from '../../types/device';
import { formatPlatform, getPlatformSeverity } from '../../utils/deviceUtils';


const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  device: {
    type: Object as () => UnifiedDevice | EnhancedUnifiedDevice | null,
    default: null
  },
  moduleType: {
    type: String,
    default: 'rmm'
  },
});

const emit = defineEmits([
  'update:visible',
  'refreshDevice',
  'lockDevice',
  'unlockDevice',
  'eraseDevice',
  'deleteDevice',
  'runCommand',
  'rebootDevice',
  'remoteAccess',
  'fileTransfer'
]);

// Convert devices to unified model
const unifiedDevice = computed(() => {
  if (!props.device) {
    return null;
  }

  if (props.moduleType) {
    return convertDevices(Array(props.device), props.moduleType)[0];
  }

  return autoConvertDevices(Array(props.device))[0];
});

const softwareFilter = ref('');

interface Software {
  name: string;
  version: string;
  source?: string;
  publisher?: string;
  installDate?: string;
}

const filteredSoftware = computed(() => {
  if (!unifiedDevice.value?.software) return [];
  const filter = softwareFilter.value.toLowerCase();
  if (!filter) return unifiedDevice.value.software;

  return unifiedDevice.value.software.filter((sw: Software) =>
    sw.name.toLowerCase().includes(filter) ||
    sw.version.toLowerCase().includes(filter) ||
    (sw.publisher && sw.publisher.toLowerCase().includes(filter))
  );
});

const onVisibilityChange = (value: boolean) => {
  emit('update:visible', value);
};

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'pending':
      return 'warning';
    case 'overdue':
      return 'warning';
    case 'offline':
      return 'danger';
    default:
      return 'info';
  }
};

const getMDMStatusSeverity = (status: string) => {
  if (!status) return 'danger';

  const statusLower = status.toLowerCase();
  if (statusLower === 'on' || statusLower.includes('active')) return 'success';
  if (statusLower === 'pending' || statusLower.includes('pending')) return 'warning';
  if (statusLower === 'off' || statusLower.includes('off')) return 'danger';

  return 'info';
};

const formatTimestamp = (timestamp: string | number | undefined) => {
  if (!timestamp) return 'Unknown';

  try {
    const date = typeof timestamp === 'number'
      ? new Date(timestamp)
      : new Date(timestamp);

    return date.toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const formatBytes = (bytes: number | undefined) => {
  if (bytes === undefined) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(2)} ${units[i]}`;
};

const formatUptime = (seconds: number) => {
  if (!seconds) return 'Unknown';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0 || days > 0) result += `${hours}h `;
  result += `${minutes}m`;

  return result;
};

// Handle Escape key press
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    onVisibilityChange(false);
  }
};

// Add/remove event listeners
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
.device-details-slider {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
}

/* Make tags more compact */
:deep(.p-tag) {
  display: inline-flex;
  width: fit-content;
  min-width: 0;
  padding: 0.15rem 0.4rem;
}

.sidebar-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.sidebar-mask.active {
  opacity: 1;
  pointer-events: all;
}

.sidebar {
  position: absolute;
  top: 0;
  right: -50%;
  width: 50%;
  height: 100%;
  background-color: var(--surface-card);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  transition: right 0.3s;
  display: flex;
  flex-direction: column;
  pointer-events: all;
}

@media screen and (max-width: 991px) {
  .sidebar {
    width: 75%;
    right: -75%;
  }
}

@media screen and (max-width: 767px) {
  .sidebar {
    width: 90%;
    right: -90%;
  }
}

.sidebar.active {
  right: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  background-color: var(--surface-section);
}

.sidebar-actions {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  background-color: var(--surface-ground);
}

.sidebar-content {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.scroll-panel {
  width: 100%;
  height: 100%;
}

:deep(.p-scrollpanel-content) {
  padding: 1rem;
}

.device-info {
  padding-bottom: 2rem;
}

.info-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--surface-section);
  border-radius: 6px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-color);
  font-weight: 600;
  font-size: 1.1rem;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.subsection-title {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-color-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.info-value {
  color: var(--text-color);
}

.disk-item,
.interface-item {
  background-color: var(--surface-ground);
  border-radius: 4px;
  padding: 0.5rem;
}

.disk-name {
  font-weight: 600;
  color: var(--text-color);
}

.disk-item {
  background-color: var(--surface-ground);
  border-radius: 4px;
  padding: 0.3rem;
  margin-bottom: 0.5rem;
}

.storage-card {
  width: calc(50% - 0.5rem);
  min-width: 200px;
  flex-grow: 0;
}

:deep(.p-progressbar) {
  height: 0.5rem !important;
}

:deep(.p-progressbar-label) {
  display: none !important;
}
</style>