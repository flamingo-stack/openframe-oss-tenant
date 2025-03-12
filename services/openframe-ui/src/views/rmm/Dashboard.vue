<template>
  <div class="rmm-dashboard">
    <div class="of-mdm-header">
      <h1 class="of-title">Dashboard</h1>
    </div>

    <div class="dashboard-grid">
      <!-- Device Statistics -->
      <div class="dashboard-card device-stats">
        <h3><i class="pi pi-desktop"></i> Device Overview</h3>
        <template v-if="deviceStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ deviceStats.total }}</span>
              <span class="stat-label">Total Devices</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{{ deviceStats.online }}</span>
              <span class="stat-label">Online</span>
            </div>
            <div class="stat-item">
              <span class="stat-value danger">{{ deviceStats.offline }}</span>
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
          <i class="pi pi-desktop empty-icon"></i>
          <h3>No Devices Found</h3>
          <p>There are no devices enrolled in RMM yet.</p>
          <p class="hint">Add devices to start monitoring them.</p>
        </div>
      </div>

      <!-- Monitoring Status -->
      <div class="dashboard-card monitoring-status">
        <h3><i class="pi pi-chart-bar"></i> Monitoring Status</h3>
        <template v-if="monitoringStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ monitoringStats.total }}</span>
              <span class="stat-label">Total Monitors</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{{ monitoringStats.healthy }}</span>
              <span class="stat-label">Healthy</span>
            </div>
            <div class="stat-item">
              <span class="stat-value danger">{{ monitoringStats.failing }}</span>
              <span class="stat-label">Failing</span>
            </div>
          </div>
          <div class="compliance-wrapper">
            <div class="compliance-progress">
              <div class="progress-track">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${Math.max(monitoringStats.healthRate, 8)}%` }"
                  :class="{ 
                    'high': monitoringStats.healthRate >= 80,
                    'medium': monitoringStats.healthRate >= 50 && monitoringStats.healthRate < 80,
                    'low': monitoringStats.healthRate < 50
                  }"
                >
                  <span class="compliance-label">{{ monitoringStats.healthRate }}% Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-chart-bar empty-icon"></i>
          <h3>No Monitors Found</h3>
          <p>No monitoring checks have been configured yet.</p>
          <p class="hint">Configure monitors to track device health.</p>
        </div>
      </div>

      <!-- Recent Alerts -->
      <div class="dashboard-card recent-alerts">
        <h3><i class="pi pi-exclamation-triangle"></i> Recent Alerts</h3>
        <template v-if="recentAlerts.length > 0">
          <DataTable 
            :value="recentAlerts" 
            :rows="5" 
            :paginator="false" 
            class="p-datatable-sm"
            stripedRows
            responsiveLayout="scroll"
          >
            <Column field="timestamp" header="Time">
              <template #body="{ data }">
                <div class="flex align-items-center">
                  <span class="text-sm">{{ formatTimestamp(data.timestamp) }}</span>
                </div>
              </template>
            </Column>

            <Column field="severity" header="Severity">
              <template #body="{ data }">
                <Tag :value="data.severity" :severity="getAlertSeverity(data.severity)" />
              </template>
            </Column>

            <Column field="message" header="Message">
              <template #body="{ data }">
                <span class="text-sm">{{ data.message }}</span>
              </template>
            </Column>
          </DataTable>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-check-circle empty-icon success"></i>
          <h3>No Recent Alerts</h3>
          <p>All systems are operating normally.</p>
          <p class="hint">Alerts will appear here when issues are detected.</p>
        </div>
      </div>

      <!-- Automation Status -->
      <div class="dashboard-card automation-status">
        <h3><i class="pi pi-cog"></i> Automation Status</h3>
        <template v-if="automationStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ automationStats.total }}</span>
              <span class="stat-label">Total Tasks</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{{ automationStats.completed }}</span>
              <span class="stat-label">Completed</span>
            </div>
            <div class="stat-item">
              <span class="stat-value warning">{{ automationStats.pending }}</span>
              <span class="stat-label">Pending</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-cog empty-icon"></i>
          <h3>No Automation Tasks</h3>
          <p>No automation tasks have been configured yet.</p>
          <p class="hint">Create tasks to automate device management.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  onlineRate: number;
}

interface MonitoringStats {
  total: number;
  healthy: number;
  failing: number;
  healthRate: number;
}

interface AutomationStats {
  total: number;
  completed: number;
  pending: number;
}

interface Alert {
  timestamp: string;
  severity: string;
  message: string;
}

interface DeviceStatsResponse {
  data: {
    total: number;
    online: number;
    offline: number;
  };
}

interface MonitoringStatsResponse {
  data: {
    total: number;
    healthy: number;
    failing: number;
  };
}

interface AutomationStatsResponse {
  data: {
    total: number;
    completed: number;
    pending: number;
  };
}

interface AlertsResponse {
  data: Alert[];
}

const deviceStats = ref<DeviceStats>({
  total: 0,
  online: 0,
  offline: 0,
  onlineRate: 0
});

const monitoringStats = ref<MonitoringStats>({
  total: 0,
  healthy: 0,
  failing: 0,
  healthRate: 0
});

const automationStats = ref<AutomationStats>({
  total: 0,
  completed: 0,
  pending: 0
});

const recentAlerts = ref<Alert[]>([]);

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const getAlertSeverity = (severity: string): string => {
  const severityMap: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info'
  };
  return severityMap[severity.toLowerCase()] || 'info';
};

const fetchDeviceStats = async () => {
  try {
    const response = await restClient.get<DeviceStatsResponse>(`${API_URL}/agents/stats/`);
    const devices = response.data || { total: 0, online: 0, offline: 0 };
    
    deviceStats.value = {
      ...devices,
      onlineRate: devices.total > 0 
        ? Math.round((devices.online / devices.total) * 100) 
        : 0
    };
  } catch (error: any) {
    console.error('Error fetching device stats:', error);
    toastService.showError('Failed to fetch device statistics');
  }
};

const fetchMonitoringStats = async () => {
  try {
    const response = await restClient.get<MonitoringStatsResponse>(`${API_URL}/checks/stats/`);
    const monitors = response.data || { total: 0, healthy: 0, failing: 0 };
    
    monitoringStats.value = {
      ...monitors,
      healthRate: monitors.total > 0 
        ? Math.round((monitors.healthy / monitors.total) * 100) 
        : 0
    };
  } catch (error: any) {
    console.error('Error fetching monitoring stats:', error);
    toastService.showError('Failed to fetch monitoring statistics');
  }
};

const fetchAutomationStats = async () => {
  try {
    const response = await restClient.get<AutomationStatsResponse>(`${API_URL}/tasks/stats/`);
    automationStats.value = response.data || { total: 0, completed: 0, pending: 0 };
  } catch (error: any) {
    console.error('Error fetching automation stats:', error);
    toastService.showError('Failed to fetch automation statistics');
  }
};

const fetchRecentAlerts = async () => {
  try {
    const response = await restClient.get<AlertsResponse>(`${API_URL}/alerts/recent/`);
    recentAlerts.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching recent alerts:', error);
    toastService.showError('Failed to fetch recent alerts');
  }
};

onMounted(async () => {
  await Promise.all([
    fetchDeviceStats(),
    fetchMonitoringStats(),
    fetchAutomationStats(),
    fetchRecentAlerts()
  ]);
});
</script>

<style scoped>
.rmm-dashboard {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.of-mdm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.of-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.dashboard-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: var(--card-shadow);
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

.stat-value.success {
  color: var(--green-500);
}

.stat-value.warning {
  color: var(--yellow-500);
}

.stat-value.danger {
  color: var(--red-500);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.compliance-wrapper {
  padding: 0 1rem;
}

.compliance-progress {
  margin-top: 1rem;
}

.progress-track {
  background: var(--surface-ground);
  border-radius: 999px;
  height: 24px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-fill.high {
  background: var(--green-500);
}

.progress-fill.medium {
  background: var(--yellow-500);
}

.progress-fill.low {
  background: var(--red-500);
}

.compliance-label {
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-icon.success {
  color: var(--green-500);
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.empty-state .hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
}
</style> 