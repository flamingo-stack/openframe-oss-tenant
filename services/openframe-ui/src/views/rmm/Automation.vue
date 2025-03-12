<template>
  <div class="rmm-automation">
    <div class="header">
      <div class="title-section">
        <h2>Automation</h2>
        <p class="subtitle">Schedule and manage automated tasks</p>
      </div>
      <div class="actions">
        <Button 
          label="Add Task" 
          icon="pi pi-plus"
          @click="showAddTaskDialog = true"
        />
      </div>
    </div>

    <div class="content">
      <DataTable
        :value="tasks"
        :loading="loading"
        v-model:filters="filters"
        filterDisplay="menu"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tasks"
        responsiveLayout="scroll"
        stripedRows
        showGridlines
        class="p-datatable-sm"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-clock empty-icon"></i>
            <h3>No Tasks Found</h3>
            <p>Add your first automation task to start scheduling.</p>
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getTaskIcon(data.type)" class="mr-2"></i>
              <span>{{ data.name }}</span>
            </div>
          </template>
        </Column>

        <Column field="type" header="Type" sortable>
          <template #body="{ data }">
            <Tag :value="formatTaskType(data.type)" 
                 :severity="getTaskTypeSeverity(data.type)" />
          </template>
        </Column>

        <Column field="schedule" header="Schedule" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatSchedule(data.schedule) }}</span>
          </template>
        </Column>

        <Column field="last_run" header="Last Run" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.last_run) }}</span>
          </template>
        </Column>

        <Column field="next_run" header="Next Run" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.next_run) }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.status" 
                 :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-play" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Run Now'"
                @click="runTask(data)" 
              />
              <Button 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewTask(data)" 
              />
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Task'"
                @click="editTask(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Task'"
                @click="deleteTask(data)" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add/Edit Task Dialog -->
    <Dialog 
      v-model:visible="showAddTaskDialog" 
      :style="{ width: '800px' }" 
      :header="isEditMode ? 'Edit Task' : 'Add New Task'" 
      :modal="true"
      class="p-fluid"
    >
      <div class="field">
        <label for="name">Name</label>
        <InputText 
          id="name" 
          v-model="newTask.name" 
          required 
          autofocus 
          :class="{ 'p-invalid': submitted && !newTask.name }"
        />
        <small class="p-error" v-if="submitted && !newTask.name">
          Name is required.
        </small>
      </div>

      <div class="field">
        <label for="type">Type</label>
        <Dropdown
          id="type"
          v-model="newTask.type"
          :options="taskTypes"
          optionLabel="name"
          optionValue="value"
          placeholder="Select a task type"
          :class="{ 'p-invalid': submitted && !newTask.type }"
        />
        <small class="p-error" v-if="submitted && !newTask.type">
          Type is required.
        </small>
      </div>

      <div class="field">
        <label for="description">Description</label>
        <InputText 
          id="description" 
          v-model="newTask.description" 
          required 
          :class="{ 'p-invalid': submitted && !newTask.description }"
        />
        <small class="p-error" v-if="submitted && !newTask.description">
          Description is required.
        </small>
      </div>

      <div class="field">
        <label for="schedule">Schedule (Cron Expression)</label>
        <InputText 
          id="schedule" 
          v-model="newTask.schedule" 
          required 
          placeholder="*/5 * * * *"
          :class="{ 'p-invalid': submitted && !newTask.schedule }"
        />
        <small class="p-error" v-if="submitted && !newTask.schedule">
          Schedule is required.
        </small>
        <small class="p-text-secondary">
          Example: */5 * * * * (every 5 minutes)
        </small>
      </div>

      <div class="field">
        <label for="devices">Target Devices</label>
        <MultiSelect
          id="devices"
          v-model="newTask.device_ids"
          :options="devices"
          optionLabel="hostname"
          optionValue="id"
          placeholder="Select target devices"
          :class="{ 'p-invalid': submitted && newTask.device_ids.length === 0 }"
          display="chip"
        />
        <small class="p-error" v-if="submitted && newTask.device_ids.length === 0">
          Select at least one device.
        </small>
      </div>

      <div class="field">
        <label for="script">Script</label>
        <Dropdown
          id="script"
          v-model="newTask.script_id"
          :options="scripts"
          optionLabel="name"
          optionValue="id"
          placeholder="Select a script"
          :class="{ 'p-invalid': submitted && !newTask.script_id }"
        />
        <small class="p-error" v-if="submitted && !newTask.script_id">
          Script is required.
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
          @click="saveTask" 
          :loading="submitting"
        />
      </template>
    </Dialog>

    <!-- Delete Task Confirmation -->
    <Dialog 
      v-model:visible="deleteTaskDialog" 
      :style="{ width: '450px' }" 
      header="Confirm" 
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedTask">
          Are you sure you want to delete <b>{{ selectedTask.name }}</b>?
        </span>
      </div>
      <template #footer>
        <Button 
          label="No" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="deleteTaskDialog = false"
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
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

interface Task {
  id: string;
  name: string;
  type: string;
  description: string;
  schedule: string;
  script_id: string;
  device_ids: string[];
  last_run: string;
  next_run: string;
  status: string;
}

interface Device {
  id: string;
  hostname: string;
}

interface Script {
  id: string;
  name: string;
}

interface TasksResponse {
  data: Task[];
}

interface DevicesResponse {
  data: Device[];
}

interface ScriptsResponse {
  data: Script[];
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

const loading = ref(true);
const tasks = ref<Task[]>([]);
const devices = ref<Device[]>([]);
const scripts = ref<Script[]>([]);
const showAddTaskDialog = ref(false);
const deleteTaskDialog = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const isEditMode = ref(false);

const selectedTask = ref<Task | null>(null);

const newTask = ref({
  name: '',
  type: null as string | null,
  description: '',
  schedule: '',
  script_id: null as string | null,
  device_ids: [] as string[]
});

const taskTypes = [
  { name: 'Maintenance', value: 'maintenance' },
  { name: 'Backup', value: 'backup' },
  { name: 'Update', value: 'update' },
  { name: 'Custom', value: 'custom' }
];

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const formatTaskType = (type: string) => {
  const typeMap: Record<string, string> = {
    maintenance: 'Maintenance',
    backup: 'Backup',
    update: 'Update',
    custom: 'Custom'
  };
  return typeMap[type] || type;
};

const getTaskIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    maintenance: 'pi pi-wrench',
    backup: 'pi pi-database',
    update: 'pi pi-refresh',
    custom: 'pi pi-cog'
  };
  return iconMap[type] || 'pi pi-clock';
};

const getTaskTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    maintenance: 'info',
    backup: 'warning',
    update: 'success',
    custom: 'info'
  };
  return severityMap[type] || 'info';
};

const getStatusSeverity = (status: string) => {
  const severityMap: Record<string, string> = {
    scheduled: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger'
  };
  return severityMap[status.toLowerCase()] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const formatSchedule = (schedule: string) => {
  // TODO: Implement human-readable cron expression formatting
  return schedule;
};

const fetchTasks = async () => {
  loading.value = true;
  try {
    const response = await restClient.get<TasksResponse>(`${API_URL}/tasks/`);
    tasks.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    toastService.showError('Failed to fetch tasks');
  } finally {
    loading.value = false;
  }
};

const fetchDevices = async () => {
  try {
    const response = await restClient.get<DevicesResponse>(`${API_URL}/agents/`);
    devices.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    toastService.showError('Failed to fetch devices');
  }
};

const fetchScripts = async () => {
  try {
    const response = await restClient.get<ScriptsResponse>(`${API_URL}/scripts/`);
    scripts.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching scripts:', error);
    toastService.showError('Failed to fetch scripts');
  }
};

const hideDialog = () => {
  showAddTaskDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newTask.value = {
    name: '',
    type: null,
    description: '',
    schedule: '',
    script_id: null,
    device_ids: []
  };
};

const saveTask = async () => {
  submitted.value = true;

  if (!newTask.value.name || !newTask.value.type || 
      !newTask.value.description || !newTask.value.schedule ||
      !newTask.value.script_id || newTask.value.device_ids.length === 0) {
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value && selectedTask.value) {
      await restClient.patch(`${API_URL}/tasks/${selectedTask.value.id}/`, newTask.value);
      toastService.showSuccess('Task updated successfully');
    } else {
      await restClient.post(`${API_URL}/tasks/`, newTask.value);
      toastService.showSuccess('Task added successfully');
    }
    await fetchTasks();
    hideDialog();
  } catch (error: any) {
    console.error('Error saving task:', error);
    toastService.showError(isEditMode.value ? 'Failed to update task' : 'Failed to add task');
  } finally {
    submitting.value = false;
  }
};

const runTask = async (task: Task) => {
  try {
    await restClient.post(`${API_URL}/tasks/${task.id}/run/`);
    toastService.showSuccess('Task execution started');
    await fetchTasks();
  } catch (error: any) {
    console.error('Error running task:', error);
    toastService.showError('Failed to run task');
  }
};

const viewTask = (task: Task) => {
  selectedTask.value = task;
  newTask.value = { ...task };
  isEditMode.value = true;
  showAddTaskDialog.value = true;
};

const editTask = (task: Task) => {
  selectedTask.value = task;
  newTask.value = { ...task };
  isEditMode.value = true;
  showAddTaskDialog.value = true;
};

const deleteTask = (task: Task) => {
  selectedTask.value = task;
  deleteTaskDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedTask.value) return;

  deleting.value = true;
  try {
    await restClient.delete(`${API_URL}/tasks/${selectedTask.value.id}/`);
    await fetchTasks();
    deleteTaskDialog.value = false;
    selectedTask.value = null;
    toastService.showSuccess('Task deleted successfully');
  } catch (error: any) {
    console.error('Error deleting task:', error);
    toastService.showError('Failed to delete task');
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    fetchTasks(),
    fetchDevices(),
    fetchScripts()
  ]);
});
</script>

<style scoped>
.rmm-automation {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1.5rem 2rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: var(--text-color-secondary);
  margin: 0;
}

.content {
  flex: 1;
  padding: 2rem;
  background: var(--surface-ground);
  overflow-y: auto;
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

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.p-text-secondary {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}
</style> 