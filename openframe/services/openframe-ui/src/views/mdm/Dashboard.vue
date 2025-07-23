<template>
  <div class="mdm-dashboard">
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
          <p>There are no devices enrolled in MDM yet.</p>
        </div>
      </div>

      <!-- Policy Status -->
      <div class="dashboard-card policy-stats">
        <h3><i class="pi pi-shield"></i> Policy Status</h3>
        <template v-if="policyStats.total > 0">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ policyStats.total }}</span>
              <span class="stat-label">Total Policies</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ policyStats.compliant }}</span>
              <span class="stat-label">Compliant</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ policyStats.nonCompliant }}</span>
              <span class="stat-label">Non-Compliant</span>
            </div>
          </div>
          <div class="compliance-wrapper">
            <div class="compliance-progress">
              <div class="progress-track">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${Math.max(policyStats.complianceRate, 8)}%` }"
                  :class="{ 
                    'high': policyStats.complianceRate >= 80,
                    'medium': policyStats.complianceRate >= 50 && policyStats.complianceRate < 80,
                    'low': policyStats.complianceRate < 50
                  }"
                >
                  <span class="compliance-label">{{ policyStats.complianceRate }}% Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-shield empty-icon"></i>
          <h3>No Policies Found</h3>
          <p>There are no policies configured yet.</p>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="dashboard-card recent-activities">
        <h3><i class="pi pi-clock"></i> Recent Activities</h3>
        <template v-if="recentActivities.length > 0">
          <DataTable 
            :value="recentActivities" 
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

            <Column field="type" header="Type">
              <template #body="{ data }">
                <Tag :value="data.type" :severity="getActivitySeverity(data.type)" />
              </template>
            </Column>

            <Column field="description" header="Description">
              <template #body="{ data }">
                <span class="text-sm">{{ data.description }}</span>
              </template>
            </Column>
          </DataTable>
        </template>
        <div v-else class="empty-state">
          <i class="pi pi-clock empty-icon"></i>
          <h3>No Recent Activities</h3>
          <p>No MDM activities have been recorded yet.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from '@vue/runtime-core';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import { FleetService } from '../../services/FleetService';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';

const configService = ConfigService.getInstance();
const config = configService.getConfig();

const API_URL = `${config.gatewayUrl}/tools/fleetmdm-server/api/v1/fleet`;

const fleetService = FleetService.getInstance();

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  byPlatform: Record<string, number>;
  onlineRate: number;
}

interface PolicyStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
}

interface ActivityDisplay {
  timestamp: string;
  type: string;
  description: string;
}

interface FleetResponse {
  hosts: Device[];
}

interface Device {
  status: string;
  platform: string;
}

interface FleetActivityResponse {
  activities: Array<{
    created_at: string;
    type: string;
    details: any;
    actor_full_name?: string;
  }>;
}

interface FleetPolicyResponse {
  policies: Array<{
    passing_host_count: number;
    failing_host_count: number;
  }>;
}

const deviceStats = ref<DeviceStats>({
  total: 0,
  online: 0,
  offline: 0,
  byPlatform: {},
  onlineRate: 0
});

const policyStats = ref<PolicyStats>({
  total: 0,
  compliant: 0,
  nonCompliant: 0,
  complianceRate: 0
});

const recentActivities = ref<ActivityDisplay[]>([]);

const formatPlatform = (platform: string) => fleetService.formatPlatform(platform);
const getPlatformSeverity = (platform: string) => fleetService.getPlatformSeverity(platform);
const getActivitySeverity = (type: string) => fleetService.getActivitySeverity(type);

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const fetchDeviceStats = async () => {
  try {
    const response = await restClient.get(`${API_URL}/hosts`) as FleetResponse;
    const devices = response.hosts || [];
    
    const stats: DeviceStats = {
      total: devices.length,
      online: devices.filter((d: Device) => d.status === 'online').length,
      offline: devices.filter((d: Device) => d.status === 'offline' || d.status === 'unknown').length,
      byPlatform: {},
      onlineRate: 0
    };

    devices.forEach((device: Device) => {
      stats.byPlatform[device.platform] = (stats.byPlatform[device.platform] || 0) + 1;
    });

    stats.onlineRate = stats.total > 0 
      ? Math.round((stats.online / stats.total) * 100) 
      : 0;

    deviceStats.value = stats;
  } catch (error) {
    console.error('Error fetching device stats:', error);
  }
};

const fetchPolicyStats = async () => {
  try {
    const response = await restClient.get(`${API_URL}/global/policies`) as FleetPolicyResponse;
    const policies = response.policies || [];
    
    const stats: PolicyStats = {
      total: policies.length,
      compliant: policies.filter((p) => {
        return p.passing_host_count > 0 || p.failing_host_count === 0;
      }).length,
      nonCompliant: 0,
      complianceRate: 0
    };

    stats.nonCompliant = stats.total - stats.compliant;
    stats.complianceRate = stats.total > 0 
      ? Math.round((stats.compliant / stats.total) * 100) 
      : 0;

    policyStats.value = stats;
  } catch (error) {
    console.error('Error fetching policy stats:', error);
  }
};

const fetchRecentActivities = async () => {
  try {
    const response = await restClient.get(`${API_URL}/activities?limit=5`) as FleetActivityResponse;
    recentActivities.value = response.activities.map(activity => ({
      timestamp: activity.created_at,
      type: activity.type,
      description: getActivityDescription(activity)
    }));
  } catch (error) {
    console.error('Error fetching recent activities:', error);
  }
};

const getActivityDescription = (activity: any): string => {
  switch (activity.type) {
    case 'created_user':
      return `User ${activity.details.user_name} (${activity.details.user_email}) was created`;
    case 'changed_user_global_role':
      return `User ${activity.details.user_name} role changed to ${activity.details.role}`;
    case 'user_logged_in':
      return `${activity.actor_full_name || 'User'} logged in from ${activity.details.public_ip || 'unknown IP'}`;
    case 'user_failed_login':
      return `Failed login attempt for ${activity.details.email}`;
    case 'fleet_enrolled':
      return `Device ${activity.details.host_display_name} (${activity.details.host_serial}) was enrolled`;
    default:
      return activity.type.replace(/_/g, ' ');
  }
};

onMounted(async () => {
  await Promise.all([
    fetchDeviceStats(),
    fetchPolicyStats(),
    fetchRecentActivities()
  ]);
});
</script>

<style scoped>
.mdm-dashboard {
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

.platform-distribution {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.platform-count {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
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

.compliance-bar,
.compliance-rate {
  display: none;
}

:deep(.p-tag) {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
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

    &:first-child {
      border-top-left-radius: var(--border-radius);
    }

    &:last-child {
      border-top-right-radius: var(--border-radius);
    }
  }

  .p-datatable-tbody > tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    > td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    &:last-child {
      border-bottom: none;
      
      > td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }
      
      > td:last-child {
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

.device-stats, .policy-stats {
  grid-column: span 1;
}

.recent-activities {
  grid-column: span 2;
}

@media screen and (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .device-stats, .policy-stats, .recent-activities {
    grid-column: span 1;
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
</style> 