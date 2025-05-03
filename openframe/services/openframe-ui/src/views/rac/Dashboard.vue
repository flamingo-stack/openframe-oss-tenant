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
                <div 
                  class="progress-fill" 
                  :style="{ width: `${Math.max(deviceStats.onlineRate, 8)}%` }"
                  :class="{ 
                    'high': deviceStats.onlineRate >= 80,
                    'medium': deviceStats.onlineRate >= 50 && deviceStats.onlineRate < 80,
                    'low': deviceStats.onlineRate < 50
                  }"
                >
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

      <!-- Connection Status -->
      <div class="dashboard-card connection-status">
        <h3><i class="pi pi-link"></i> Connection Status</h3>
        <template v-if="connectionStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ connectionStats.total }}</span>
              <span class="stat-label">Total Connections</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{{ connectionStats.active }}</span>
              <span class="stat-label">Active</span>
            </div>
            <div class="stat-item">
              <span class="stat-value warning">{{ connectionStats.completed }}</span>
              <span class="stat-label">Completed</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-link empty-icon"></i>
          <h3>No Active Connections</h3>
          <p>No remote connections are currently active.</p>
          <p class="hint">Connect to a device to see connection details here.</p>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="dashboard-card recent-activity">
        <h3><i class="pi pi-history"></i> Recent Activity</h3>
        <template v-if="recentActivity.length > 0">
          <DataTable 
            :value="recentActivity" 
            :rows="5" 
            :paginator="false" 
            class="p-datatable-sm"
            stripedRows
            responsiveLayout="scroll"
          >
            <Column field="time" header="Time">
              <template #body="{ data }">
                <div class="flex align-items-center">
                  <span class="text-sm">{{ formatTimestamp(data.time) }}</span>
                </div>
              </template>
            </Column>

            <Column field="type" header="Type">
              <template #body="{ data }">
                <Tag :value="formatActivityType(data.type)" :severity="getActivitySeverity(data.type)" />
              </template>
            </Column>

            <Column field="hostname" header="Device">
              <template #body="{ data }">
                <span class="text-sm">{{ data.device?.name || 'Unknown Device' }}</span>
              </template>
            </Column>

            <Column field="username" header="User">
              <template #body="{ data }">
                <span class="text-sm">{{ data.username }}</span>
              </template>
            </Column>
          </DataTable>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-history empty-icon"></i>
          <h3>No Recent Activity</h3>
          <p>No recent remote access activity to display.</p>
          <p class="hint">Activity will appear here as you connect to devices.</p>
        </div>
      </div>

      <!-- File Transfer -->
      <div class="dashboard-card file-transfer">
        <h3><i class="pi pi-file"></i> File Transfer</h3>
        <template v-if="transferStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ transferStats.total }}</span>
              <span class="stat-label">Total Transfers</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{{ transferStats.uploads }}</span>
              <span class="stat-label">Uploads</span>
            </div>
            <div class="stat-item">
              <span class="stat-value warning">{{ transferStats.downloads }}</span>
              <span class="stat-label">Downloads</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-file empty-icon"></i>
          <h3>No File Transfers</h3>
          <p>No file transfers have been initiated yet.</p>
          <p class="hint">File transfers will appear here once you start transferring files.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "@vue/runtime-core";
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import type { Device, ConnectionHistory } from '../../types/rac';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();
const loading = ref<boolean>(false);

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  onlineRate: number;
}

interface ConnectionStats {
  total: number;
  active: number;
  completed: number;
}

interface TransferStats {
  total: number;
  uploads: number;
  downloads: number;
}

const deviceStats = ref<DeviceStats>({
  total: 0,
  online: 0,
  offline: 0,
  onlineRate: 0
});

const connectionStats = ref<ConnectionStats>({
  total: 0,
  active: 0,
  completed: 0
});

const transferStats = ref<TransferStats>({
  total: 0,
  uploads: 0,
  downloads: 0
});

const recentActivity = ref<ConnectionHistory[]>([]);
const refreshInterval = ref<number | null>(null);

const fetchDeviceStats = async () => {
  try {
    console.log('Fetching device stats...');
    
    const response = await restClient.get(`${API_URL}/api/listdevices`);
    const devices = Array.isArray(response) ? response : [];
    
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

const fetchConnectionStats = async () => {
  try {
    // For now we'll fetch devices and check for active sessions
    const response = await restClient.get(`${API_URL}/api/listdevices`);
    const devices = Array.isArray(response) ? response : [];
    
    // Count devices with active sessions for KVM or terminal
    const active = devices.filter(d => 
      d.sessions && (
        (d.sessions.kvm && Object.keys(d.sessions.kvm).length > 0) || 
        (d.sessions.terminal && Object.keys(d.sessions.terminal).length > 0)
      )
    ).length;
    
    // In the future we'll need an endpoint to get completed sessions history
    const completed = 0;
    const total = active + completed;
    
    connectionStats.value = {
      total,
      active,
      completed
    };
  } catch (error) {
    console.error('Failed to fetch connection stats:', error);
    toastService.showError('Failed to fetch connection stats');
  }
};

const fetchTransferStats = async () => {
  try {
    // Currently no direct API for file transfer stats, will need to be implemented
    // when file transfer history API is available
    
    // For now, initialize with zeros
    transferStats.value = {
      total: 0,
      uploads: 0,
      downloads: 0
    };
  } catch (error) {
    console.error('Failed to fetch transfer stats:', error);
    toastService.showError('Failed to fetch transfer stats');
  }
};

const fetchRecentActivity = async () => {
  try {
    // Fetch devices to get session information
    const response = await restClient.get(`${API_URL}/api/listdevices`);
    const devices = Array.isArray(response) ? response : [];
    
    // Transform active device sessions into recent activity entries
    const activities: ConnectionHistory[] = [];
    
    devices.forEach(device => {
      if (device.sessions) {
        // Check for KVM sessions
        if (device.sessions.kvm) {
          Object.keys(device.sessions.kvm).forEach(userId => {
            activities.push({
              id: activities.length + 1,
              time: new Date().toISOString(),
              type: 'remote_connection',
              username: userId.split('//')[1] || 'Unknown',
              duration: device.sessions.kvm[userId] || 0,
              device_id: device._id,
              device: {
                name: device.name || 'Unknown'
              }
            });
          });
        }
        
        // Check for terminal sessions
        if (device.sessions.terminal) {
          Object.keys(device.sessions.terminal).forEach(userId => {
            activities.push({
              id: activities.length + 1,
              time: new Date().toISOString(),
              type: 'terminal_session',
              username: userId.split('//')[1] || 'Unknown',
              duration: device.sessions.terminal[userId] || 0,
              device_id: device._id,
              device: {
                name: device.name || 'Unknown'
              }
            });
          });
        }
      }
    });
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    
    // Take the most recent 5 activities
    recentActivity.value = activities.slice(0, 5);
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
      fetchConnectionStats(),
      fetchTransferStats(),
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
    remote_connection: 'Remote Connection',
    file_transfer: 'File Transfer'
  };
  return typeMap[type.toLowerCase()] || type;
};

const getActivitySeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    remote_connection: 'info',
    file_transfer: 'success'
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

.dashboard-card > :not(h3) {
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

:deep(.p-datatable) {
  .p-datatable-wrapper {
    border-radius: var(--border-radius);
    background: var(--surface-card);
  }

  .p-datatable-header {
    background: var(--surface-card);
    padding: 1.5rem;
    border: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-datatable-thead > tr > th {
    background: var(--surface-card);
    color: var(--text-color-secondary);
    padding: 1rem 1.5rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    border-bottom: 2px solid var(--surface-border);
  }

  .p-datatable-tbody > tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
    }

    > td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;
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

  &.p-tag-success {
    background: var(--green-100);
    color: var(--green-900);
  }

  &.p-tag-danger {
    background: var(--red-100);
    color: var(--red-900);
  }

  &.p-tag-warning {
    background: var(--yellow-100);
    color: var(--yellow-900);
  }

  &.p-tag-info {
    background: var(--blue-100);
    color: var(--blue-900);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;

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

@media screen and (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
