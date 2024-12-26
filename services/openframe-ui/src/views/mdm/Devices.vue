<template>
  <div class="mdm-devices">
    <div v-if="error" class="error-message">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="loading" class="loading-spinner">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <span>Loading devices...</span>
    </div>

    <div v-else class="devices-content">
      <DataTable :value="devices" 
                :paginator="true" 
                :rows="10"
                :rowsPerPageOptions="[10, 20, 50]"
                responsiveLayout="scroll"
                class="p-datatable-sm"
                v-model:filters="filters"
                filterDisplay="menu"
                :globalFilterFields="['hostname', 'platform', 'os_version', 'status']">
        <template #header>
          <div class="flex justify-content-between">
            <Button icon="pi pi-refresh" 
                    class="p-button-text p-button-sm" 
                    @click="fetchDevices" />
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText v-model="filters['global'].value" 
                        placeholder="Search devices..." 
                        class="p-inputtext-sm" />
            </span>
          </div>
        </template>

        <Column field="hostname" header="Hostname" sortable>
          <template #body="{ data }">
            {{ data.display_name || data.hostname }}
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable>
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" 
                 :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="os_version" header="OS Version" sortable />

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

        <Column field="actions" header="Actions">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-lock" 
                      class="p-button-text p-button-sm" 
                      :disabled="!data.mdm?.enrollment_status"
                      @click="lockDevice(data)" />
              <Button icon="pi pi-trash" 
                      class="p-button-text p-button-sm p-button-danger" 
                      @click="deleteDevice(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

const toast = useToast();
const loading = ref(true);
const error = ref('');
const devices = ref([]);

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

const fetchDevices = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await restClient.get(`${API_URL}/hosts`);
    devices.value = response.hosts || [];
  } catch (err) {
    console.error('Error fetching devices:', err);
    error.value = err instanceof Error ? err.message : 'Failed to fetch devices';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

const lockDevice = async (device: any) => {
  try {
    await restClient.post(`${API_URL}/commands/run`, {
      host_uuids: [device.uuid],
      request_type: 'DeviceLock'
    });
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Device lock command sent successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error locking device:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to lock device',
      life: 5000
    });
  }
};

const deleteDevice = async (device: any) => {
  try {
    await restClient.delete(`${API_URL}/hosts/${device.id}`);
    await fetchDevices();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Device deleted successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error deleting device:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete device',
      life: 5000
    });
  }
};

onMounted(() => {
  fetchDevices();
});
</script>

<style scoped>
.mdm-devices {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.devices-content {
  flex: 1;
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
  .p-datatable-header {
    background: var(--surface-section);
    padding: 1rem;
  }

  .p-datatable-thead > tr > th {
    background: var(--surface-section);
  }
}
</style> 