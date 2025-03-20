<template>
  <div class="rmm-monitoring">
    <ModuleHeader title="Monitoring">
      <template #actions>
        <OFButton 
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
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewMonitor(data)" 
              />
              <OFButton 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Monitor'"
                @click="editMonitor(data)" 
              />
              <OFButton 
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
          <OFButton 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="hideDialog"
          />
          <OFButton 
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
          <OFButton 
            label="No" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="deleteMonitorDialog = false"
          />
          <OFButton 
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
import { ref, onMounted } from "@vue/runtime-core";
import Column from 'primevue/column';
import { OFButton } from '../../components/ui';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
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

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
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
  { name: 'Network Traffic', value: 'network' },
  { name: 'Service Status', value: 'service' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatMonitorType = (type: string) => {
  const typeMap: Record<string, string> = {
    cpu: 'CPU Usage',
    memory: 'Memory Usage',
    disk: 'Disk Usage',
    network: 'Network Traffic',
    service: 'Service Status'
  };
  return typeMap[type] || type;
};

const getMonitorIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    cpu: 'pi pi-microchip',
    memory: 'pi pi-server',
    disk: 'pi pi-hdd',
    network: 'pi pi-globe',
    service: 'pi pi-cog'
  };
  return iconMap[type] || 'pi pi-chart-line';
};

const getMonitorTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    cpu: 'info',
    memory: 'warning',
    disk: 'danger',
    network: 'success',
    service: 'primary'
  };
  return severityMap[type] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    'ok': 'success',
    'warning': 'warning',
    'critical': 'danger',
    'unknown': 'info'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const fetchMonitors = async () => {
  try {
    loading.value = true;
    const response = await restClient.get<MonitorsResponse>(`${API_URL}/checks/`);
    monitors.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch monitors:', error);
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
  try {
    submitted.value = true;
    if (!validateMonitor()) return;

    submitting.value = true;
    const endpoint = isEditMode.value && selectedMonitor.value ? 
      `${API_URL}/checks/${selectedMonitor.value.id}` : 
      `${API_URL}/checks`;

    const method = isEditMode.value ? 'put' : 'post';
    await restClient[method](endpoint, newMonitor.value);

    hideDialog();
    await fetchMonitors();
    toastService.showSuccess(`Monitor ${isEditMode.value ? 'updated' : 'created'} successfully`);
  } catch (error) {
    console.error('Failed to save monitor:', error);
    toastService.showError(`Failed to ${isEditMode.value ? 'update' : 'create'} monitor`);
  } finally {
    submitting.value = false;
  }
};

const viewMonitor = (monitor: Monitor) => {
  selectedMonitor.value = monitor;
  newMonitor.value = { ...monitor };
  isEditMode.value = true;
  showAddMonitorDialog.value = true;
};

const editMonitor = (monitor: Monitor) => {
  selectedMonitor.value = monitor;
  newMonitor.value = { ...monitor };
  isEditMode.value = true;
  showAddMonitorDialog.value = true;
};

const deleteMonitor = async (monitor: Monitor) => {
  try {
    await restClient.delete(`${API_URL}/checks/${monitor.id}`);
    await fetchMonitors();
    deleteMonitorDialog.value = false;
    toastService.showSuccess('Monitor deleted successfully');
  } catch (error) {
    console.error('Failed to delete monitor:', error);
    toastService.showError('Failed to delete monitor');
  }
};

const confirmDelete = async () => {
  if (!selectedMonitor.value) return;

  deleting.value = true;
  try {
    await deleteMonitor(selectedMonitor.value);
  } catch (error) {
    console.error('Failed to delete monitor:', error);
    toastService.showError('Failed to delete monitor');
  } finally {
    deleting.value = false;
  }
};

const validateMonitor = () => {
  if (!newMonitor.value.name || !newMonitor.value.type || 
      !newMonitor.value.target || !newMonitor.value.description) {
    return false;
  }
  return true;
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