<template>
  <div class="rmm-automation">
    <ModuleHeader title="Automation">
      <template #subtitle>Schedule and manage automated tasks</template>
      <template #actions>
        <OFButton 
          label="Add Task" 
          icon="pi pi-plus"
          @click="showAddTaskDialog = true"
          class="p-button-primary"
        />
      </template>
    </ModuleHeader>

    <div class="automation-content">
      <SearchBar v-model="filters['global'].value" placeholder="Search tasks..." />

      <ModuleTable 
        :items="tasks" 
        :loading="loading"
        :searchFields="['name', 'type', 'description', 'schedule']"
        emptyIcon="pi pi-clock"
        emptyTitle="No Tasks Found"
        emptyMessage="Add your first automation task to start scheduling."
        emptyHint="Tasks will appear here once they are created."
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getTaskIcon(data.type)" class="task-icon mr-2"></i>
              <span class="font-medium">{{ data.name }}</span>
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
              <OFButton 
                icon="pi pi-play" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Run Now'"
                @click="runTask(data)" 
              />
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'"
                @click="viewTask(data)" 
              />
              <OFButton 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Task'"
                @click="editTask(data)" 
              />
              <OFButton 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Task'"
                @click="deleteTask(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Add/Edit Task Dialog -->
    <Dialog 
      v-model:visible="showAddTaskDialog" 
      :style="{ width: '800px' }" 
      :header="isEditMode ? 'Edit Task' : 'Add New Task'" 
      :modal="true"
      class="p-dialog-custom"
      :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }"
    >
      <div class="of-form-group">
        <label for="name" class="of-form-label">Name</label>
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

      <div class="of-form-group">
        <label for="type" class="of-form-label">Type</label>
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

      <div class="of-form-group">
        <label for="description" class="of-form-label">Description</label>
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

      <div class="of-form-group">
        <label for="schedule" class="of-form-label">Schedule (Cron Expression)</label>
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
        <small class="of-text-secondary of-text-sm">
          Example: */5 * * * * (every 5 minutes)
        </small>
      </div>

      <div class="of-form-group">
        <label for="devices" class="of-form-label">Target Devices</label>
        <MultiSelect
          id="devices"
          v-model="newTask.device_ids"
          :options="devices"
          optionLabel="hostname"
          optionValue="id"
          placeholder="Select target devices"
          :error="submitted && newTask.device_ids.length === 0 ? 'Select at least one device.' : ''"
        />
      </div>

      <div class="of-form-group">
        <label for="script" class="of-form-label">Script</label>
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
            @click="saveTask" 
            :loading="submitting"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Task Confirmation -->
    <Dialog 
      v-model:visible="deleteTaskDialog" 
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
        <span v-if="selectedTask">
          Are you sure you want to delete <b>{{ selectedTask.name }}</b>?
        </span>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <OFButton 
            label="No" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="deleteTaskDialog = false"
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
import { ref, onMounted } from "vue";
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import { getTaskIcon } from '../../utils/deviceUtils';
// Import from our new UI component library
import { 
  OFButton, 
  Column, 
  Dialog, 
  InputText, 
  Dropdown, 
  MultiSelect, 
  Tag 
} from "../../components/ui";

interface Task {
  id: string;
  name: string;
  type: string;
  description: string;
  schedule: string;
  script_id: string;
  device_ids: string[];
  last_run?: string;
  next_run?: string;
  status?: string;
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

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
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
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
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
  try {
    loading.value = true;
    const response = await restClient.get<Task[]>(`${API_URL}/tasks/`);
    tasks.value = response;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    toastService.showError('Failed to fetch automation tasks');
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
  try {
    submitted.value = true;
    if (!validateTask()) return;

    submitting.value = true;
    const endpoint = isEditMode.value && selectedTask.value ? 
      `${API_URL}/automation/tasks/${selectedTask.value.id}` : 
      `${API_URL}/automation/tasks`;

    const method = isEditMode.value ? 'put' : 'post';
    await restClient[method](endpoint, newTask.value);

    hideDialog();
    await fetchTasks();
    toastService.showSuccess(`Task ${isEditMode.value ? 'updated' : 'created'} successfully`);
  } catch (error) {
    console.error('Failed to save task:', error);
    toastService.showError(`Failed to ${isEditMode.value ? 'update' : 'create'} task`);
  } finally {
    submitting.value = false;
  }
};

const runTask = async (task: Task) => {
  try {
    await restClient.post(`${API_URL}/automation/tasks/${task.id}/run`);
    await fetchTasks();
    toastService.showSuccess('Task execution started');
  } catch (error) {
    console.error('Failed to run task:', error);
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

const deleteTask = async (task: Task) => {
  try {
    await restClient.delete(`${API_URL}/automation/tasks/${task.id}`);
    await fetchTasks();
    deleteTaskDialog.value = false;
    toastService.showSuccess('Task deleted successfully');
  } catch (error) {
    console.error('Failed to delete task:', error);
    toastService.showError('Failed to delete task');
  }
};

const confirmDelete = async () => {
  if (!selectedTask.value) return;

  deleting.value = true;
  try {
    await deleteTask(selectedTask.value);
  } catch (error: any) {
    console.error('Error deleting task:', error);
    toastService.showError('Failed to delete task');
  } finally {
    deleting.value = false;
  }
};

const validateTask = () => {
  if (!newTask.value.name || !newTask.value.type || 
      !newTask.value.description || !newTask.value.schedule ||
      !newTask.value.script_id || newTask.value.device_ids.length === 0) {
    return false;
  }
  return true;
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
  background: var(--surface-ground);
}

.automation-content {
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

.task-icon {
  font-size: 1.125rem;
  color: var(--primary-color);
}

.p-text-secondary {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}
</style>                                                                              