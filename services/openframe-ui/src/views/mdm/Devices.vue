<template>
  <div class="mdm-devices">
    <div class="of-mdm-header">
      <h1 class="of-title">Devices</h1>
    </div>

    <div class="w-30rem mr-auto">
      <div class="p-inputgroup">
        <span class="p-inputgroup-addon">
          <i class="pi pi-search"></i>
        </span>
        <InputText 
          v-model="filters['global'].value" 
          placeholder="Search devices..." 
        />
      </div>
    </div>

    <div class="devices-content">
      <DataTable 
        :value="devices" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        v-model:filters="filters"
        filterDisplay="menu"
        :loading="loading"
        :globalFilterFields="['hostname', 'platform', 'os_version', 'status']"
        stripedRows
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-desktop empty-icon"></i>
            <h3>No Devices Found</h3>
            <p>There are no devices enrolled in MDM yet.</p>
            <p class="hint">Devices will appear here once they are enrolled in your MDM server.</p>
          </div>
        </template>

        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i class="pi pi-desktop mr-2"></i>
              <span>{{ data.display_name || data.hostname }}</span>
            </div>
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable>
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" 
                 :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="os_version" header="OS Version" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.os_version }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" 
                 :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="mdm.enrollment_status" header="MDM Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.mdm?.enrollment_status || 'Not enrolled'" 
                 :severity="getMDMStatusSeverity(data.mdm?.enrollment_status)" />
          </template>
        </Column>

        <Column field="actions" header="Actions" :sortable="false" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-lock" 
                class="p-button-text p-button-sm" 
                :disabled="!data.mdm?.enrollment_status"
                v-tooltip.top="'Lock Device'"
                @click="lockDevice(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Device'"
                @click="deleteDevice(data)" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

interface FleetResponse<T> {
  data: T;
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

const router = useRouter();
const toastService = ToastService.getInstance();

const loading = ref(true);
const error = ref('');
const devices = ref<any[]>([]);

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    ios: 'iOS',
    ipados: 'iPadOS',
    chrome: 'Chrome OS'
  };
  return platformMap[platform] || platform;
};

const getPlatformSeverity = (platform: string) => {
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success',
    ios: 'info',
    ipados: 'info',
    chrome: 'warning'
  };
  return severityMap[platform] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    online: 'success',
    offline: 'danger',
    unknown: 'warning'
  };
  return severityMap[status] || 'warning';
};

const getMDMStatusSeverity = (status: string | null) => {
  if (!status) return 'danger';
  if (status.toLowerCase().includes('on')) return 'success';
  if (status.toLowerCase().includes('pending')) return 'warning';
  return 'info';
};

const extractUrlFromMessage = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.match(urlRegex);
  if (match) {
    const url = match[0];
    const textWithoutUrl = message.replace(url, '');
    return { url, text: textWithoutUrl.trim() };
  }
  return { text: message };
};

const fetchDevices = async () => {
  loading.value = true;
  try {
    const response = await restClient.get(`${API_URL}/hosts`) as FleetResponse<any[]>;
    devices.value = response.data || [];
  } catch (err: any) {
    toastService.showError(err.message);
  } finally {
    loading.value = false;
  }
};

const lockDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/devices/${device.device_uuid}/lock`);
    toastService.showSuccess('Device locked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const unlockDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/devices/${device.device_uuid}/unlock`);
    toastService.showSuccess('Device unlocked successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const eraseDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/devices/${device.device_uuid}/erase`);
    toastService.showSuccess('Device erase command sent successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const deleteDevice = async (device: any) => {
  try {
    await restClient.delete(`${API_URL}/hosts/${device.id}`);
    await fetchDevices();
    toastService.showSuccess('Device deleted successfully');
  } catch (err) {
    console.error('Error deleting device:', err);
    toastService.showError('Failed to delete device');
  }
};

onMounted(() => {
  fetchDevices();
});
</script>

<style scoped>
.mdm-devices {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;

  :deep(.p-input-icon-left) {
    width: 100%;
    max-width: 30rem;

    input {
      width: 100%;
      background: var(--surface-ground);
    }
  }
}

.devices-content {
  flex: 1;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--red-100);
  color: var(--red-700);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
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

      .pi {
        font-size: 1.125rem;
        color: var(--primary-color);
      }

      .flex.align-items-center {
        gap: 0.75rem;

        .pi-desktop {
          color: var(--text-color-secondary);
          opacity: 0.7;
        }

        span {
          font-weight: 500;
        }
      }
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

  .p-paginator {
    background: var(--surface-ground);
    border: none;
    padding: 1.25rem 1rem;
    margin-top: 1rem;
    border-radius: var(--border-radius);

    .p-paginator-pages .p-paginator-page {
      min-width: 2.5rem;
      height: 2.5rem;
      margin: 0 0.25rem;
      border-radius: var(--border-radius);
      font-weight: 600;
      transition: all 0.2s ease;

      &.p-highlight {
        background: var(--primary-color);
        color: var(--primary-color-text);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
      }

      &:not(.p-highlight):hover {
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
    }
  }

  .p-sortable-column {
    &:not(.p-highlight):hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    &.p-highlight {
      background: var(--surface-card);
      color: var(--primary-color);

      .p-sortable-column-icon {
        color: var(--primary-color);
      }
    }

    .p-sortable-column-icon {
      font-size: 0.75rem;
      margin-left: 0.5rem;
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

:deep(.p-button.p-button-icon-only) {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;

  &.p-button-text:enabled:hover {
    background: var(--surface-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-button-danger:enabled:hover {
    background: var(--red-50);
    color: var(--red-900);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .pi {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  &:hover .pi {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.filters {
  :deep(.p-inputgroup-addon) {
    padding: 0.5rem 1rem;
    background: var(--surface-section);
    border: 1px solid var(--surface-border);
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
  }

  :deep(.p-inputtext) {
    flex: 1;
    border: 1px solid var(--surface-border);
    padding: 0.75rem;
    background: var(--surface-section);
    color: var(--text-color);

    &:enabled:hover {
      border-color: var(--primary-color);
    }

    &:enabled:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
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