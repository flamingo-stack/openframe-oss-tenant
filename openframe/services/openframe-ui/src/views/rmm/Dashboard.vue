<template>
  <div class="rmm-dashboard">
    <div class="dashboard-grid">
      <!-- Device Statistics -->
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
          <p>There are no devices enrolled in RMM yet.</p>
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
          <i class="pi pi-exclamation-triangle empty-icon"></i>
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
import { ref, onMounted } from "@vue/runtime-core";
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import type { Device, Alert, Check, Task } from '../../types/rmm';

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
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

const fetchDeviceStats = async () => {
  try {
    console.log('Fetching device stats...');
    const response = await restClient.get<Device[]>(`${API_URL}/agents/`);
    console.log('API Response:', response);
    
    const devices = Array.isArray(JSON.parse(response)) ? JSON.parse(response) : [];
    console.log('Processed devices:', devices);
    
    const total = devices.length;
    const online = devices.filter((d: Device) => d.status === 'online').length;
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

const fetchMonitoringStats = async () => {
  try {
    const response = await restClient.get<Check[]>(`${API_URL}/checks/`);
    const checks = Array.isArray(response) ? response : [];
    
    const totalChecks = checks.length;
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const failing = totalChecks - healthy;
    const healthRate = totalChecks > 0 ? Math.round((healthy / totalChecks) * 100) : 0;
    
    monitoringStats.value = {
      total: totalChecks,
      healthy,
      failing,
      healthRate
    };
  } catch (error) {
    console.error('Failed to fetch monitoring stats:', error);
    toastService.showError('Failed to fetch monitoring stats');
  }
};

const fetchAutomationStats = async () => {
  try {
    const response = await restClient.get<Task[]>(`${API_URL}/tasks/`);
    const tasks = Array.isArray(response) ? response : [];
    
    const totalTasks = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = totalTasks - completed;
    
    automationStats.value = {
      total: totalTasks,
      completed,
      pending
    };
  } catch (error) {
    console.error('Failed to fetch automation stats:', error);
    toastService.showError('Failed to fetch automation stats');
  }
};

const fetchRecentAlerts = async () => {
  try {
    const response = await restClient.patch<{ alerts: Alert[] }>(`${API_URL}/alerts/`, {
      top: 10
    }, {
      headers: { 
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      credentials: 'include'
    });
    recentAlerts.value = response.alerts || [];
  } catch (error) {
    console.error('Failed to fetch recent alerts:', error);
    toastService.showError('Failed to fetch recent alerts');
  }
};

const fetchDashboardData = async () => {
  try {
    await Promise.all([
      fetchDeviceStats(),
      fetchMonitoringStats(),
      fetchAutomationStats(),
      fetchRecentAlerts()
    ]);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    toastService.showError('Failed to fetch dashboard data');
  }
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const getAlertSeverity = (severity: string) => {
  const severityMap: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info'
  };
  return severityMap[severity.toLowerCase()] || 'info';
};

onMounted(async () => {
  await fetchDashboardData();
});
</script>

<style scoped>
.rmm-dashboard {
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