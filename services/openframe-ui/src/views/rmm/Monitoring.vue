<template>
  <div class="rmm-monitoring">
    <div class="of-mdm-header">
      <h1 class="of-title">Monitoring</h1>
      <Button 
        label="Add Monitor" 
        icon="pi pi-plus"
        @click="showAddMonitorDialog = true"
        class="p-button-primary"
      />
    </div>

    <div class="w-30rem mr-auto">
      <div class="p-inputgroup">
        <span class="p-inputgroup-addon">
          <i class="pi pi-search"></i>
        </span>
        <InputText 
          v-model="filters['global'].value" 
          placeholder="Search monitors..." 
        />
      </div>
    </div>

    <div class="monitoring-content">
      <DataTable
        :value="monitors"
        :loading="loading"
        v-model:filters="filters"
        filterDisplay="menu"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} monitors"
        responsiveLayout="scroll"
        stripedRows
        showGridlines
        class="p-datatable-sm"
        :globalFilterFields="['name', 'type', 'status', 'target']"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-chart-line empty-icon"></i>
            <h3>No Monitors Found</h3>
            <p>Add your first monitor to start tracking device metrics.</p>
            <p class="hint">Monitors will appear here once they are configured.</p>
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getMonitorIcon(data.type)" class="mr-2"></i>
              <span>{{ data.name }}</span>
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
      </DataTable>
    </div>

    <!-- Add/Edit Monitor Dialog -->
    <Dialog 
      v-model:visible="showAddMonitorDialog" 
      :style="{ width: '600px' }" 
      :header="isEditMode ? 'Edit Monitor' : 'Add New Monitor'" 
      :modal="true"
      class="p-fluid"
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
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="hideDialog"
        />
        <Button 
          :label="isEditMode ? 'Save' : 'Add'" 
          icon="pi pi-check" 
          class="p-button-text" 
          @click="saveMonitor" 
          :loading="submitting"
        />
      </template>
    </Dialog>

    <!-- Delete Monitor Confirmation -->
    <Dialog 
      v-model:visible="deleteMonitorDialog" 
      :style="{ width: '450px' }" 
      header="Confirm" 
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedMonitor">
          Are you sure you want to delete <b>{{ selectedMonitor.name }}</b>?
        </span>
      </div>
      <template #footer>
        <Button 
          label="No" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="deleteMonitorDialog = false"
        />
        <Button 
          label="Yes" 
          icon="pi pi-check" 
          class="p-button-text" 
          @click="confirmDelete" 
          :loading="deleting"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

interface Monitor {
  id: string;
  name: string;
  type: string;
  target: string;
  description: string;
  status: string;
  last_check: string;
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

const newMonitor = ref({
  name: '',
  type: null as string | null,
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
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
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
    type: null,
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

.monitoring-content {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
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

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
</style> 