<template>
  <div class="rmm-scripts">
    <ModuleHeader title="Scripts">
      <template #actions>
        <Button 
          label="Add Script" 
          icon="pi pi-plus"
          @click="showAddScriptDialog = true"
          class="p-button-primary"
        />
      </template>
    </ModuleHeader>

    <div class="scripts-content">
      <SearchBar v-model="filters['global'].value" placeholder="Search scripts..." />

      <ModuleTable 
        :items="scripts" 
        :loading="loading"
        :searchFields="['name', 'type', 'description']"
        emptyIcon="pi pi-code"
        emptyTitle="No Scripts Found"
        emptyMessage="Add your first script to start automating tasks."
        emptyHint="Scripts will appear here once they are created."
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getScriptIcon(data.type)" class="script-icon mr-2"></i>
              <span class="font-medium">{{ data.name }}</span>
            </div>
          </template>
        </Column>

        <Column field="type" header="Type" sortable>
          <template #body="{ data }">
            <Tag :value="formatScriptType(data.type)" 
                 :severity="getScriptTypeSeverity(data.type)" />
          </template>
        </Column>

        <Column field="description" header="Description" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.description }}</span>
          </template>
        </Column>

        <Column field="created_at" header="Created" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.created_at) }}</span>
          </template>
        </Column>

        <Column field="last_run" header="Last Run" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ formatTimestamp(data.last_run) }}</span>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-play" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Run Script'"
                @click="runScript(data)" 
              />
              <Button 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Script'"
                @click="viewScript(data)" 
              />
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Script'"
                @click="editScript(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Script'"
                @click="deleteScript(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Add/Edit Script Dialog -->
    <Dialog 
      v-model:visible="showAddScriptDialog" 
      :style="{ width: '800px' }" 
      :header="isEditMode ? 'Edit Script' : 'Add New Script'" 
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
          v-model="newScript.name" 
          required 
          autofocus 
          :class="{ 'p-invalid': submitted && !newScript.name }"
        />
        <small class="p-error" v-if="submitted && !newScript.name">
          Name is required.
        </small>
      </div>

      <div class="field">
        <label for="type">Type</label>
        <Dropdown
          id="type"
          v-model="newScript.type"
          :options="scriptTypes"
          optionLabel="name"
          optionValue="value"
          placeholder="Select a script type"
          :class="{ 'p-invalid': submitted && !newScript.type }"
        />
        <small class="p-error" v-if="submitted && !newScript.type">
          Type is required.
        </small>
      </div>

      <div class="field">
        <label for="description">Description</label>
        <InputText 
          id="description" 
          v-model="newScript.description" 
          required 
          :class="{ 'p-invalid': submitted && !newScript.description }"
        />
        <small class="p-error" v-if="submitted && !newScript.description">
          Description is required.
        </small>
      </div>

      <div class="field">
        <label for="content">Script Content</label>
        <Textarea 
          id="content" 
          v-model="newScript.content" 
          rows="12"
          class="font-mono"
          :class="{ 'p-invalid': submitted && !newScript.content }"
        />
        <small class="p-error" v-if="submitted && !newScript.content">
          Script content is required.
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
            @click="saveScript" 
            :loading="submitting"
          />
        </div>
      </template>
    </Dialog>

    <!-- Run Script Dialog -->
    <Dialog 
      v-model:visible="showRunScriptDialog" 
      :style="{ width: '600px' }" 
      header="Run Script" 
      :modal="true"
      class="p-dialog-custom"
      :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }"
    >
      <div class="field">
        <label for="devices">Target Devices</label>
        <MultiSelect
          id="devices"
          v-model="selectedDevices"
          :options="devices"
          optionLabel="hostname"
          optionValue="id"
          placeholder="Select target devices"
          :class="{ 'p-invalid': runSubmitted && selectedDevices.length === 0 }"
          display="chip"
        />
        <small class="p-error" v-if="runSubmitted && selectedDevices.length === 0">
          Select at least one device.
        </small>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="showRunScriptDialog = false"
          />
          <Button 
            label="Run" 
            icon="pi pi-play" 
            class="p-button-primary" 
            @click="executeScript" 
            :loading="executing"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Script Confirmation -->
    <Dialog 
      v-model:visible="deleteScriptDialog" 
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
        <span v-if="selectedScript">
          Are you sure you want to delete <b>{{ selectedScript.name }}</b>?
        </span>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button 
            label="No" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="deleteScriptDialog = false"
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
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Tag from 'primevue/tag';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';

interface Script {
  id: string;
  name: string;
  type: string;
  description: string;
  content: string;
  created_at: string;
  last_run: string;
}

interface Device {
  id: string;
  hostname: string;
}

interface ScriptsResponse {
  data: Script[];
}

interface DevicesResponse {
  data: Device[];
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

const loading = ref(true);
const scripts = ref<Script[]>([]);
const devices = ref<Device[]>([]);
const showAddScriptDialog = ref(false);
const showRunScriptDialog = ref(false);
const deleteScriptDialog = ref(false);
const submitted = ref(false);
const runSubmitted = ref(false);
const submitting = ref(false);
const executing = ref(false);
const deleting = ref(false);
const isEditMode = ref(false);

const selectedScript = ref<Script | null>(null);
const selectedDevices = ref<string[]>([]);

const newScript = ref({
  name: '',
  type: null as string | null,
  description: '',
  content: ''
});

const scriptTypes = [
  { name: 'PowerShell', value: 'powershell' },
  { name: 'Bash', value: 'bash' },
  { name: 'Python', value: 'python' },
  { name: 'Batch', value: 'batch' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatScriptType = (type: string) => {
  const typeMap: Record<string, string> = {
    powershell: 'PowerShell',
    bash: 'Bash',
    python: 'Python',
    batch: 'Batch'
  };
  return typeMap[type] || type;
};

const getScriptIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    powershell: 'pi pi-microsoft',
    bash: 'pi pi-terminal',
    python: 'pi pi-code',
    batch: 'pi pi-file-edit'
  };
  return iconMap[type] || 'pi pi-code';
};

const getScriptTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    powershell: 'info',
    bash: 'warning',
    python: 'success',
    batch: 'info'
  };
  return severityMap[type] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const fetchScripts = async () => {
  loading.value = true;
  try {
    const response = await restClient.get<ScriptsResponse>(`${API_URL}/scripts/`);
    scripts.value = response.data || [];
  } catch (error: any) {
    console.error('Error fetching scripts:', error);
    toastService.showError('Failed to fetch scripts');
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

const hideDialog = () => {
  showAddScriptDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newScript.value = {
    name: '',
    type: null,
    description: '',
    content: ''
  };
};

const saveScript = async () => {
  submitted.value = true;

  if (!newScript.value.name || !newScript.value.type || 
      !newScript.value.content || !newScript.value.description) {
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value && selectedScript.value) {
      await restClient.patch(`${API_URL}/scripts/${selectedScript.value.id}/`, newScript.value);
      toastService.showSuccess('Script updated successfully');
    } else {
      await restClient.post(`${API_URL}/scripts/`, newScript.value);
      toastService.showSuccess('Script added successfully');
    }
    await fetchScripts();
    hideDialog();
  } catch (error: any) {
    console.error('Error saving script:', error);
    toastService.showError(isEditMode.value ? 'Failed to update script' : 'Failed to add script');
  } finally {
    submitting.value = false;
  }
};

const runScript = async (script: Script) => {
  if (selectedDevices.value.length === 0) {
    toastService.showError('Please select at least one device');
    return;
  }

  executing.value = true;
  try {
    await restClient.post(`${API_URL}/scripts/${script.id}/run/`, {
      device_ids: selectedDevices.value
    });
    showRunScriptDialog.value = false;
    selectedDevices.value = [];
    toastService.showSuccess('Script execution started');
  } catch (error: any) {
    console.error('Error running script:', error);
    toastService.showError('Failed to run script');
  } finally {
    executing.value = false;
  }
};

const executeScript = async () => {
  if (!selectedScript.value) return;

  runSubmitted.value = true;
  if (selectedDevices.value.length === 0) return;

  executing.value = true;
  try {
    await restClient.post(`${API_URL}/scripts/${selectedScript.value.id}/run/`, {
      device_ids: selectedDevices.value
    });
    toastService.showSuccess('Script execution started');
    showRunScriptDialog.value = false;
  } catch (error: any) {
    console.error('Error executing script:', error);
    toastService.showError('Failed to execute script');
  } finally {
    executing.value = false;
  }
};

const viewScript = (script: Script) => {
  selectedScript.value = script;
  newScript.value = { ...script };
  isEditMode.value = true;
  showAddScriptDialog.value = true;
};

const editScript = (script: Script) => {
  selectedScript.value = script;
  newScript.value = { ...script };
  isEditMode.value = true;
  showAddScriptDialog.value = true;
};

const deleteScript = (script: Script) => {
  selectedScript.value = script;
  deleteScriptDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedScript.value) return;

  deleting.value = true;
  try {
    await restClient.delete(`${API_URL}/scripts/${selectedScript.value.id}`);
    await fetchScripts();
    deleteScriptDialog.value = false;
    selectedScript.value = null;
    toastService.showSuccess('Script deleted successfully');
  } catch (error: any) {
    console.error('Error deleting script:', error);
    toastService.showError('Failed to delete script');
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await fetchScripts();
});
</script>

<style scoped>
.rmm-scripts {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.scripts-content {
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

.script-icon {
  font-size: 1.125rem;
  color: var(--primary-color);
}

.font-mono {
  font-family: monospace;
}
</style> 