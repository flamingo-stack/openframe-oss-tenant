<template>
  <div class="rac-dashboard">
    <div class="dashboard-grid">
      <!-- Device Overview -->
      <div class="dashboard-card device-stats">
        <h3><i class="pi pi-mobile"></i> Device Overview</h3>
        <template v-if="deviceStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ deviceStats.total }}</span>
              <span class="stat-label">Total Devices</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ deviceStats.online }}</span>
              <span class="stat-label">Online</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ deviceStats.offline }}</span>
              <span class="stat-label">Offline</span>
            </div>
          </div>
          <div class="compliance-wrapper">
            <div class="compliance-progress">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${Math.max(deviceStats.onlineRate, 8)}%` }" :class="{
                  'high': deviceStats.onlineRate >= 80,
                  'medium': deviceStats.onlineRate >= 50 && deviceStats.onlineRate < 80,
                  'low': deviceStats.onlineRate < 50
                }">
                  <span class="compliance-label">{{ deviceStats.onlineRate }}% Online</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-mobile empty-icon"></i>
          <h3>No Devices Found</h3>
          <p>There are no devices connected via MeshCentral yet.</p>
          <p class="hint">Add devices to start managing them remotely.</p>
        </div>
      </div>

      <!-- OS Distribution -->
      <div class="dashboard-card os-distribution">
        <h3><i class="pi pi-desktop"></i> OS Distribution</h3>
        <template v-if="osDistribution.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value windows">{{ osDistribution.windows }}</span>
              <span class="stat-label">
                <i class="pi pi-microsoft"></i>
                <span class="os-name-text">Windows</span>
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-value mac">{{ osDistribution.mac }}</span>
              <span class="stat-label">
                <i class="pi pi-apple"></i>
                <span class="os-name-text">macOS</span>
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-value linux">{{ osDistribution.linux }}</span>
              <span class="stat-label">
                <i class="pi pi-desktop"></i>
                <span class="os-name-text">Linux</span>
              </span>
            </div>
          </div>
          <div class="os-distribution-wrapper">
            <div class="os-progress">
              <div class="progress-track">
                <div v-if="osDistribution.windows > 0" class="progress-segment windows"
                  :style="{ width: `${osDistribution.windowsPercentage}%` }">
                  <span v-if="osDistribution.windowsPercentage >= 15" class="distribution-label">{{
                    osDistribution.windowsPercentage }}%</span>
                </div>
                <div v-if="osDistribution.mac > 0" class="progress-segment mac"
                  :style="{ width: `${osDistribution.macPercentage}%` }">
                  <span v-if="osDistribution.macPercentage >= 15" class="distribution-label">{{
                    osDistribution.macPercentage }}%</span>
                </div>
                <div v-if="osDistribution.linux > 0" class="progress-segment linux"
                  :style="{ width: `${osDistribution.linuxPercentage}%` }">
                  <span v-if="osDistribution.linuxPercentage >= 15" class="distribution-label">{{
                    osDistribution.linuxPercentage }}%</span>
                </div>
                <div v-if="osDistribution.other > 0" class="progress-segment other"
                  :style="{ width: `${osDistribution.otherPercentage}%` }">
                  <span v-if="osDistribution.otherPercentage >= 15" class="distribution-label">{{
                    osDistribution.otherPercentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-desktop empty-icon"></i>
          <h3>No OS Data</h3>
          <p>No device operating system information available.</p>
          <p class="hint">Add devices to see their operating system distribution.</p>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="dashboard-card recent-activity">
        <h3><i class="pi pi-clock"></i> Recent Activities</h3>
        <template v-if="recentActivity.length > 0">
          <DataTable :value="recentActivity" :rows="5" :paginator="false" class="p-datatable-sm" stripedRows
            responsiveLayout="scroll">
            <Column field="time" header="Time">
              <template #body="{ data }">
                <span class="text-sm">{{ formatTimestamp(data.time) }}</span>
              </template>
            </Column>

            <Column field="etype" header="Type">
              <template #body="{ data }">
                <Tag :value="formatActivityType(data.etype)" :severity="getActivitySeverity(data.etype)" />
              </template>
            </Column>

            <Column field="device" header="Device">
              <template #body="{ data }">
                <span class="text-sm">{{ data.device?.displayName || '-' }}</span>
              </template>
            </Column>

            <Column field="msg" header="Message">
              <template #body="{ data }">
                <div class="message-cell">
                  <span class="text-sm">{{ data.msg }}</span>
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-clock empty-icon"></i>
          <h3>No Recent Activities</h3>
          <p>No recent remote access activities to display.</p>
          <p class="hint">Activities will appear here as you connect to devices.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "@vue/runtime-core";
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { ConfigService } from '../../config/config.service';
import { convertDevices } from '../../utils/deviceAdapters';
import { RACService } from '../../services/RACService';
import { ToastService } from '../../services/ToastService';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();
const racService = RACService.getInstance();
const loading = ref<boolean>(false);

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  onlineRate: number;
}

interface OsDistribution {
  total: number;
  windows: number;
  mac: number;
  linux: number;
  other: number;
  windowsPercentage: number;
  macPercentage: number;
  linuxPercentage: number;
  otherPercentage: number;
  windowsPercentageExact: number;
  macPercentageExact: number;
  linuxPercentageExact: number;
  otherPercentageExact: number;
}

interface MeshEvent {
  etype: string;
  action: string;
  userid?: string;
  username?: string;
  nodeid?: string;
  msg: string;
  time: string;
  device?: {
    name: string;
  };
}

interface DeviceInfo {
  General: {
    'Server Name': string;
    [key: string]: any;
  };
  [section: string]: any;
}

const deviceStats = ref<DeviceStats>({
  total: 0,
  online: 0,
  offline: 0,
  onlineRate: 0
});

const osDistribution = ref<OsDistribution>({
  total: 0,
  windows: 0,
  mac: 0,
  linux: 0,
  other: 0,
  windowsPercentage: 0,
  macPercentage: 0,
  linuxPercentage: 0,
  otherPercentage: 0,
  windowsPercentageExact: 0,
  macPercentageExact: 0,
  linuxPercentageExact: 0,
  otherPercentageExact: 0
});

const recentActivity = ref<MeshEvent[]>([]);
const refreshInterval = ref<number | null>(null);

const fetchDeviceStats = async () => {
  try {
    console.log('Fetching device stats...');

    const devices = await racService.fetchDevices();

    const total = devices.length;
    const online = devices.filter(d => d.conn === 1).length;
    const offline = total - online;
    const onlineRate = total > 0 ? Math.round((online / total) * 100) : 0;

    console.log('Calculated stats:', { total, online, offline, onlineRate });

    deviceStats.value = {
      total,
      online,
      offline,
      onlineRate
    };
  } catch (error) {
    console.error('Failed to fetch device stats:', error);
    toastService.showError('Failed to fetch device stats');
  }
};

const fetchOsDistribution = async () => {
  try {
    // Get all devices
    const devices = await racService.fetchDevices();

    if (devices.length === 0) {
      console.log('No devices found');
      return;
    }

    let windowsCount = 0;
    let macCount = 0;
    let linuxCount = 0;
    let otherCount = 0;

    devices.forEach(device => {
      const osDesc = (device.osdesc || '').toLowerCase();

      if (osDesc.includes('windows')) {
        windowsCount++;
      } else if (osDesc.includes('mac') || osDesc.includes('darwin') || osDesc.includes('osx')) {
        macCount++;
      } else if (
        osDesc.includes('linux') ||
        osDesc.includes('ubuntu') ||
        osDesc.includes('debian') ||
        osDesc.includes('fedora') ||
        osDesc.includes('unix') ||
        osDesc.includes('centos')
      ) {
        linuxCount++;
      } else {
        otherCount++;
      }
    });

    const total = windowsCount + macCount + linuxCount + otherCount;

    if (total > 0) {
      // Calculate exact percentages
      const windowsPercentageExact = (windowsCount / total) * 100;
      const macPercentageExact = (macCount / total) * 100;
      const linuxPercentageExact = (linuxCount / total) * 100;
      const otherPercentageExact = (otherCount / total) * 100;

      // Rounded percentages for display
      const windowsPercentage = Math.round(windowsPercentageExact);
      const macPercentage = Math.round(macPercentageExact);
      const linuxPercentage = Math.round(linuxPercentageExact);
      const otherPercentage = Math.round(otherPercentageExact);

      console.log('OS distribution percentages:', {
        windowsPercentageExact, macPercentageExact, linuxPercentageExact, otherPercentageExact,
        windowsPercentage, macPercentage, linuxPercentage, otherPercentage
      });

      osDistribution.value = {
        total,
        windows: windowsCount,
        mac: macCount,
        linux: linuxCount,
        other: otherCount,
        windowsPercentage,
        macPercentage,
        linuxPercentage,
        otherPercentage,
        windowsPercentageExact,
        macPercentageExact,
        linuxPercentageExact,
        otherPercentageExact
      };
    }

    console.log('OS distribution data:', osDistribution.value);
  } catch (error) {
    console.error('Failed to fetch OS distribution:', error);
    toastService.showError('Failed to fetch OS distribution');
  }
};

const fetchRecentActivity = async () => {
  try {
    // Fetch events from the API
    const events = await racService.fetchRecentEvents();

    // Process events and fetch device info where needed
    const uniqueNodeIds = new Set(events.map(event => event.nodeid).filter(nodeid => nodeid));
    const nodeIdToDeviceInfoMap = new Map();

    for (const nodeId of uniqueNodeIds) {
      try {
        const deviceInfo = await racService.fetchDeviceDetails(nodeId);
        
        if (deviceInfo.General == null) {
          continue;
        }
        const device = convertDevices([deviceInfo], 'rac')[0];
        console.log('Device:', device);
        nodeIdToDeviceInfoMap.set(nodeId, device);
      } catch (error) {
        console.error(`Failed to fetch device info for ${nodeId}:`, error);
      }
    }

    // Process events with device information
    const processedEvents = events.map(event => {
      const processedEvent = { ...event };

      if (event.nodeid && nodeIdToDeviceInfoMap.has(event.nodeid)) {
        processedEvent.device = nodeIdToDeviceInfoMap.get(event.nodeid);
      }

      return processedEvent;
    });

    // Sort by timestamp (most recent first) and take the 5 most recent events
    processedEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    recentActivity.value = processedEvents.slice(0, 100);
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    toastService.showError('Failed to fetch recent activity');
  }
};

const fetchDashboardData = async () => {
  try {
    loading.value = true;
    await Promise.all([
      fetchDeviceStats(),
      fetchOsDistribution(),
      fetchRecentActivity()
    ]);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    toastService.showError('Failed to fetch dashboard data');
  } finally {
    loading.value = false;
  }
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const formatActivityType = (type: string) => {
  const typeMap: Record<string, string> = {
    'relay': 'Remote Session',
    'node': 'Device Action',
    'user': 'User Action',
    'mesh': 'Group Action'
  };
  return typeMap[type.toLowerCase()] || type;
};

const getActivitySeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    'relay': 'info',
    'node': 'success',
    'user': 'warning',
    'mesh': 'info'
  };
  return severityMap[type.toLowerCase()] || 'info';
};

onMounted(async () => {
  await fetchDashboardData();

  // Set up auto-refresh every 30 seconds
  refreshInterval.value = window.setInterval(() => {
    fetchDashboardData();
  }, 30000);
});

onUnmounted(() => {
  // Clear the interval when component is unmounted
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
});
</script>

<style scoped>
.rac-dashboard {
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.dashboard-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.recent-activity {
  grid-column: span 2;
}

.dashboard-card> :not(h3) {
  flex: 1;
}

.dashboard-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dashboard-card h3 i {
  color: var(--primary-color);
  opacity: 0.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.stat-label i {
  font-size: 1rem;
}

.os-name-text {
  font-weight: 600;
}

.compliance-wrapper {
  padding: 0.5rem 0;
}

.compliance-progress {
  margin: 1rem 0;
}

.progress-track {
  background: var(--surface-hover);
  border-radius: 1rem;
  height: 2.5rem;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  position: relative;
  border-radius: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.progress-fill.high {
  background: var(--primary-color);
}

.progress-fill.medium {
  background: var(--primary-color);
  opacity: 0.8;
}

.progress-fill.low {
  background: var(--primary-color);
  opacity: 0.6;
}

.compliance-label {
  color: var(--primary-color-text);
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.message-cell {
  max-width: 100%;
  word-wrap: break-word;
  white-space: normal;
  line-height: 1.4;
  display: block;
  min-width: 100px;
}

:deep(.p-datatable) {
  .p-datatable-wrapper {
    border-radius: var(--border-radius);
    background: var(--surface-card);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .p-datatable-header {
    background: var(--surface-card);
    padding: 1.5rem;
    border: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-datatable-thead>tr>th {
    background: var(--surface-card);
    color: var(--text-color-secondary);
    padding: 1rem 1.5rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    border-bottom: 2px solid var(--surface-border);

    &:first-child {
      border-top-left-radius: var(--border-radius);
    }

    &:last-child {
      border-top-right-radius: var(--border-radius);
    }
  }

  .p-datatable-tbody>tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    >td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;
      vertical-align: top;
      word-break: normal;
      overflow-wrap: break-word;
    }

    &:last-child {
      border-bottom: none;

      >td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }

      >td:last-child {
        border-bottom-right-radius: var(--border-radius);
      }
    }
  }
}

:deep(.p-tag) {
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-tag-success {
    background: var(--green-50);
    color: var(--green-900);
    border: 1px solid var(--green-200);
  }

  &.p-tag-danger {
    background: var(--red-50);
    color: var(--red-900);
    border: 1px solid var(--red-200);
  }

  &.p-tag-warning {
    background: var(--yellow-50);
    color: var(--yellow-900);
    border: 1px solid var(--yellow-200);
  }

  &.p-tag-info {
    background: var(--blue-50);
    color: var(--blue-900);
    border: 1px solid var(--blue-200);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--surface-card);
  border-radius: var(--border-radius);

  .empty-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
  }

  p {
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.5;

    &.hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
      opacity: 0.8;
    }
  }
}

.os-distribution {
  display: flex;
  flex-direction: column;
}

.os-distribution-wrapper {
  padding: 0.5rem 0;
}

.os-progress {
  margin: 1rem 0;
}

.progress-segment {
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.5px;
}

.progress-segment.windows {
  background: var(--primary-color);
}

.progress-segment.mac {
  background: var(--text-color);
}

.progress-segment.linux {
  background: var(--blue-400);
}

.progress-segment.other {
  background: var(--purple-500);
}

.distribution-label {
  white-space: nowrap;
  padding: 0 0.5rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.stat-value.windows {
  color: var(--primary-color);
}

.stat-value.mac {
  color: var(--text-color);
}

.stat-value.linux {
  color: var(--blue-400);
}

.stat-value.other {
  color: var(--purple-500);
}

@media screen and (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
