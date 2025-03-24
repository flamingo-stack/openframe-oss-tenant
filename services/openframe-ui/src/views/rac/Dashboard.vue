<template>
  <div class="rac-dashboard">
    <ModuleHeader title="RAC Dashboard">
      <template #subtitle>Remote Access and Control Overview</template>
      <template #actions>
        <OFButton
          icon="pi pi-refresh"
          class="p-button-text"
          @click="fetchDashboardData"
          v-tooltip.left="'Refresh Dashboard'"
        />
      </template>
    </ModuleHeader>
    
    <div class="dashboard-grid">
      <!-- Device Statistics -->
      <div class="dashboard-card device-stats">
        <h3><i class="pi pi-desktop"></i> Device Statistics</h3>
        <div v-if="deviceStats.total > 0" class="stats-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ deviceStats.total }}</div>
              <div class="stat-label">Total Devices</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ deviceStats.online }}</div>
              <div class="stat-label">Online</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ deviceStats.offline }}</div>
              <div class="stat-label">Offline</div>
            </div>
          </div>
          
          <div class="compliance-wrapper">
            <div class="progress-track">
              <div
                class="progress-fill"
                :class="getComplianceClass(deviceStats.onlineRate)"
                :style="{ width: deviceStats.onlineRate + '%' }"
              >
                <span class="compliance-label">{{ deviceStats.onlineRate }}% Online</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <i class="pi pi-desktop empty-icon"></i>
          <h3>No Devices Found</h3>
          <p>There are no devices connected via MeshCentral yet.</p>
          <p class="hint">Add devices to start managing them remotely.</p>
        </div>
      </div>
      
      <!-- Connection Status -->
      <div class="dashboard-card connection-status">
        <h3><i class="pi pi-link"></i> Connection Status</h3>
        <div v-if="connectionStats.total > 0" class="stats-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ connectionStats.total }}</div>
              <div class="stat-label">Total Connections</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ connectionStats.active }}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ connectionStats.completed }}</div>
              <div class="stat-label">Completed</div>
            </div>
          </div>
        </div>
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
        <div v-if="recentActivity.length > 0" class="activity-content">
          <DataTable :value="recentActivity" class="p-datatable-sm" stripedRows>
            <Column field="time" header="Time">
              <template #body="{ data }">
                {{ formatTimestamp(data.time) }}
              </template>
            </Column>
            <Column field="type" header="Type">
              <template #body="{ data }">
                <Tag :value="formatActivityType(data.type)" :severity="getActivitySeverity(data.type)" />
              </template>
            </Column>
            <Column field="hostname" header="Device" />
            <Column field="username" header="User" />
          </DataTable>
        </div>
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
        <div v-if="transferStats.total > 0" class="stats-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ transferStats.total }}</div>
              <div class="stat-label">Total Transfers</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ transferStats.uploads }}</div>
              <div class="stat-label">Uploads</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ transferStats.downloads }}</div>
              <div class="stat-label">Downloads</div>
            </div>
          </div>
        </div>
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
import { ref, onMounted } from "vue";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import { restClient } from "../../apollo/apolloClient";
import { OFButton } from "../../components/ui";
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import type { Device, DeviceStats, ConnectionStats, TransferStats, ConnectionHistory } from "../../types/rac";

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();

// State for dashboard cards
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

const fetchDeviceStats = async () => {
  try {
    console.log('Fetching device stats...');
    // For initial implementation, use mock data
    // Later will be connected to actual MeshCentral API
    const mockDevices = [
      {
        id: '1',
        hostname: 'DESKTOP-1',
        plat: 'windows',
        operating_system: 'Windows 10 Pro',
        status: 'online',
        last_seen: new Date().toISOString()
      },
      {
        id: '2',
        hostname: 'DESKTOP-2',
        plat: 'linux',
        operating_system: 'Ubuntu 22.04',
        status: 'offline',
        last_seen: new Date().toISOString()
      }
    ];
    
    const total = mockDevices.length;
    const online = mockDevices.filter(d => d.status === 'online').length;
    const offline = total - online;
    const onlineRate = total > 0 ? Math.round((online / total) * 100) : 0;
    
    deviceStats.value = {
      total,
      online,
      offline,
      onlineRate
    };
    
    // In a real implementation, this would be:
    // const response = await restClient.get<Device[]>(`${API_URL}/devices/`);
    // const devices = Array.isArray(response) ? response : [];
    // const total = devices.length;
    // const online = devices.filter(d => d.status === 'online').length;
    // ...etc
  } catch (error) {
    console.error('Failed to fetch device stats:', error);
    toastService.showError('Failed to fetch device stats');
  }
};

const fetchConnectionStats = async () => {
  try {
    // Mock data for initial implementation
    connectionStats.value = {
      total: 10,
      active: 2,
      completed: 8
    };
    
    // In a real implementation, this would fetch from the API
  } catch (error) {
    console.error('Failed to fetch connection stats:', error);
    toastService.showError('Failed to fetch connection stats');
  }
};

const fetchTransferStats = async () => {
  try {
    // Mock data for initial implementation
    transferStats.value = {
      total: 15,
      uploads: 8,
      downloads: 7
    };
    
    // In a real implementation, this would fetch from the API
  } catch (error) {
    console.error('Failed to fetch transfer stats:', error);
    toastService.showError('Failed to fetch transfer stats');
  }
};

const fetchRecentActivity = async () => {
  try {
    // Mock data for initial implementation
    recentActivity.value = [
      {
        id: 1,
        time: new Date().toISOString(),
        type: 'remote_connection',
        username: 'admin',
        duration: 15,
        device_id: '1'
      },
      {
        id: 2,
        time: new Date(Date.now() - 3600000).toISOString(),
        type: 'file_transfer',
        username: 'admin',
        duration: 5,
        device_id: '2'
      }
    ];
    
    // In a real implementation, this would fetch from the API
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    toastService.showError('Failed to fetch recent activity');
  }
};

const fetchDashboardData = async () => {
  try {
    await Promise.all([
      fetchDeviceStats(),
      fetchConnectionStats(),
      fetchTransferStats(),
      fetchRecentActivity()
    ]);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    toastService.showError('Failed to fetch dashboard data');
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
  return typeMap[type] || type;
};

const getActivitySeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    remote_connection: 'info',
    file_transfer: 'success'
  };
  return severityMap[type] || 'info';
};

const getComplianceClass = (rate: number) => {
  if (rate >= 80) return 'high';
  if (rate >= 50) return 'medium';
  return 'low';
};

onMounted(async () => {
  await fetchDashboardData();
});
</script>

<style scoped>
.rac-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
  padding: 1.5rem;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-state .empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.empty-state p.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

@media screen and (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
