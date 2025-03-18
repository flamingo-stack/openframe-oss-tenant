<template>
  <div class="rmm-monitoring">
    <ModuleHeader title="Monitoring">
      <template #actions>
        <Button 
          label="Add Monitor" 
          icon="pi pi-plus"
          @click="showAddMonitorDialog = true"
          class="p-button-primary"
        />
      </template>
    </ModuleHeader>

    <div class="monitoring-content">
      <SearchBar v-model="filters['global'].value" placeholder="Search monitors..." />

      <ModuleTable 
        :items="monitors" 
        :loading="loading"
        :searchFields="['name', 'type', 'status', 'target']"
        emptyIcon="pi pi-chart-line"
        emptyTitle="No Monitors Found"
        emptyMessage="Add your first monitor to start tracking device metrics."
        emptyHint="Monitors will appear here once they are configured."
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getMonitorIcon(data.type)" class="monitor-icon mr-2"></i>
              <span class="font-medium">{{ data.name }}</span>
            </div>
          </template>
        </Column>

        <Column field="type" header="Type" sortable>
          <template #body="{ data }">
            <Tag :value="formatMonitorType(data.type)" 
                 :severity="getMonitorTypeSeverity(data.type)" />
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" 
                 :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="last_check" header="Last Check" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.last_check) }}</span>
          </template>
        </Column>

        <Column field="target" header="Target" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.target }}</span>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewMonitor(data)" 
              />
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Monitor'"
                @click="editMonitor(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger"
                v-tooltip.top="'Delete Monitor'"
                @click="deleteMonitor(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Add/Edit Monitor Dialog -->
    <Dialog 
      v-model:visible="showAddMonitorDialog" 
      :style="{ width: '600px' }" 
      :header="isEditMode ? 'Edit Monitor' : 'Add New Monitor'" 
      :modal="true"
      class="p-dialog-custom"
      :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }"
    >
      <div class="field">
        <label for="name">Name</label>
        <InputText 
          id="name" 
          v-model="newMonitor.name" 
          required 
          autofocus 
          :class="{ 'p-invalid': submitted && !newMonitor.name }"
        />
        <small class="p-error" v-if="submitted && !newMonitor.name">
          Name is required.
        </small>
      </div>

      <div class="field">
        <label for="type">Type</label>
        <Dropdown
          id="type"
          v-model="newMonitor.type"
          :options="monitorTypes"
          optionLabel="name"
          optionValue="value"
          placeholder="Select a monitor type"
          :class="{ 'p-invalid': submitted && !newMonitor.type }"
        />
        <small class="p-error" v-if="submitted && !newMonitor.type">
          Type is required.
        </small>
      </div>

      <div class="field">
        <label for="target">Target</label>
        <InputText 
          id="target" 
          v-model="newMonitor.target" 
          required 
          :class="{ 'p-invalid': submitted && !newMonitor.target }"
        />
        <small class="p-error" v-if="submitted && !newMonitor.target">
          Target is required.
        </small>
      </div>

      <div class="field">
        <label for="description">Description</label>
        <Textarea 
          id="description" 
          v-model="newMonitor.description" 
          rows="3"
          :class="{ 'p-invalid': submitted && !newMonitor.description }"
        />
        <small class="p-error" v-if="submitted && !newMonitor.description">
          Description is required.
        </small>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="hideDialog"
          />
          <Button 
            :label="isEditMode ? 'Save' : 'Add'" 
            icon="pi pi-check" 
            class="p-button-primary" 
            @click="saveMonitor" 
            :loading="submitting"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Monitor Confirmation -->
    <Dialog 
      v-model:visible="deleteMonitorDialog" 
      header="Confirm" 
      :modal="true"
      :draggable="false"
      :style="{ width: '450px' }" 
      class="p-dialog-custom"
      :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedMonitor">
          Are you sure you want to delete <b>{{ selectedMonitor.name }}</b>?
        </span>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button 
            label="No" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="deleteMonitorDialog = false"
          />
          <Button 
            label="Yes" 
            icon="pi pi-check" 
            class="p-button-danger" 
            @click="confirmDelete" 
            :loading="deleting"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';

interface Monitor {
  id: string;
  name: string;
  type: string;
  target: string;
  description: string;
  status: string;
  last_check: string;
}

interface NewMonitor {
  name: string;
  type: string;
  target: string;
  description: string;
}

interface MonitorsResponse {
  data: Monitor[];
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

const loading = ref(true);
const monitors = ref<Monitor[]>([]);
const showAddMonitorDialog = ref(false);
const deleteMonitorDialog = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const isEditMode = ref(false);

const selectedMonitor = ref<Monitor | null>(null);

const newMonitor = ref<NewMonitor>({
  name: '',
  type: '',
  target: '',
  description: ''
});

const monitorTypes = [
  { name: 'CPU Usage', value: 'cpu' },
  { name: 'Memory Usage', value: 'memory' },
  { name: 'Disk Usage', value: 'disk' },
  { name: 'Network', value: 'network' },
  { name: 'Process', value: 'process' },
  { name: 'Service', value: 'service' },
  { name: 'Custom', value: 'custom' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatMonitorType = (type: string) => {
  const typeMap: Record<string, string> = {
    cpu: 'CPU Usage',
    memory: 'Memory Usage',
    disk: 'Disk Usage',
    network: 'Network',
    process: 'Process',
    service: 'Service',
    custom: 'Custom'
  };
  return typeMap[type] || type;
};

const getMonitorIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    cpu: 'pi pi-microchip',
    memory: 'pi pi-database',
    disk: 'pi pi-save',
    network: 'pi pi-wifi',
    process: 'pi pi-cog',
    service: 'pi pi-server',
    custom: 'pi pi-chart-line'
  };
  return iconMap[type] || 'pi pi-chart-line';
};

const getMonitorTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    cpu: 'info',
    memory: 'warning',
    disk: 'danger',
    network: 'success',
    process: 'info',
    service: 'warning',
    custom: 'info'
  };
  return severityMap[type] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    healthy: 'success',
    warning: 'warning',
    critical: 'danger',
    unknown: 'info'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const fetchMonitors = async () => {
  loading.value = true;
  try {
    const response = await restClient.get<MonitorsResponse>(`${API_URL}/checks/`);
    monitors.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching monitors:', error);
    toastService.showError('Failed to fetch monitors');
  } finally {
    loading.value = false;
  }
};

const hideDialog = () => {
  showAddMonitorDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newMonitor.value = {
    name: '',
    type: '',
    target: '',
    description: ''
  };
};

const saveMonitor = async () => {
  submitted.value = true;

  if (!newMonitor.value.name || !newMonitor.value.type || 
      !newMonitor.value.target || !newMonitor.value.description) {
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value && selectedMonitor.value) {
      await restClient.patch(`${API_URL}/checks/${selectedMonitor.value.id}/`, newMonitor.value);
      toastService.showSuccess('Monitor updated successfully');
    } else {
      await restClient.post(`${API_URL}/checks/`, newMonitor.value);
      toastService.showSuccess('Monitor added successfully');
    }
    await fetchMonitors();
    hideDialog();
  } catch (error: any) {
    console.error('Error saving monitor:', error);
    toastService.showError(isEditMode.value ? 'Failed to update monitor' : 'Failed to add monitor');
  } finally {
    submitting.value = false;
  }
};

const viewMonitor = (monitor: Monitor) => {
  // Implement monitor details view
  console.log('View monitor:', monitor);
};

const editMonitor = (monitor: Monitor) => {
  selectedMonitor.value = monitor;
  newMonitor.value = {
    name: monitor.name,
    type: monitor.type,
    target: monitor.target,
    description: monitor.description
  };
  isEditMode.value = true;
  showAddMonitorDialog.value = true;
};

const deleteMonitor = (monitor: Monitor) => {
  selectedMonitor.value = monitor;
  deleteMonitorDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedMonitor.value) return;

  deleting.value = true;
  try {
    await restClient.delete(`${API_URL}/checks/${selectedMonitor.value.id}/`);
    await fetchMonitors();
    deleteMonitorDialog.value = false;
    selectedMonitor.value = null;
    toastService.showSuccess('Monitor deleted successfully');
  } catch (error: any) {
    console.error('Error deleting monitor:', error);
    toastService.showError('Failed to delete monitor');
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await fetchMonitors();
});
</script>

<style scoped>
.rmm-monitoring {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.monitoring-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  min-height: 0;
  background: var(--surface-ground);
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}

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

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.monitor-icon {
  font-size: 1.125rem;
  color: var(--primary-color);
}
</style> 