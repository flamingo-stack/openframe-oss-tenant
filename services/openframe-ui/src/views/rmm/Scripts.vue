<template>
  <div class="of-scripts-view">
    <ModuleHeader title="Scripts">
      <template #actions>
        <OFButton 
          label="Add Script" 
          icon="pi pi-plus"
          @click="showAddScriptDialog = true"
          class="p-button-primary"
        />
      </template>
    </ModuleHeader>

    <div class="of-scripts-content">
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
              <OFButton 
                icon="pi pi-play" 
                class="p-button-text p-button-sm" 
                :aria-label="'Run Script'"
                @click="runScript(data)" 
              />
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                :aria-label="'View Script'"
                @click="viewScript(data)" 
              />
              <OFButton 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                :aria-label="'Edit Script'"
                @click="editScript(data)" 
              />
              <OFButton 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                :aria-label="'Delete Script'"
                @click="deleteScript(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Add/Edit Script Dialog -->
    <OFScriptDialog
      v-model="showAddScriptDialog" 
      :header="isEditMode ? 'Edit Script' : 'Add New Script'"
      width="800px"
      :confirmLabel="isEditMode ? 'Save' : 'Add'"
      confirmIcon="pi pi-check"
      :loading="submitting"
      @confirm="saveScript"
      @cancel="hideDialog"
    >
      <div class="of-form-group">
        <label for="name" class="of-form-label">Name</label>
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

      <div class="of-form-group">
        <label for="type" class="of-form-label">Type</label>
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

      <div class="of-form-group">
        <label for="description" class="of-form-label">Description</label>
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

      <div class="of-form-group">
        <label for="content" class="of-form-label">Script Content</label>
        <ScriptEditor 
          id="content" 
          v-model="newScript.content" 
          :rows="12"
          :error="submitted && !newScript.content ? 'Script content is required.' : ''"
        />
      </div>
    </OFScriptDialog>

    <!-- Run Script Dialog -->
    <OFScriptDialog
      v-model="showRunScriptDialog" 
      header="Run Script"
      width="600px"
      confirmLabel="Run"
      confirmIcon="pi pi-play"
      :loading="executing"
      @confirm="executeScript"
      @cancel="showRunScriptDialog = false"
    >
      <div class="of-form-group">
        <label for="devices" class="of-form-label">Target Devices</label>
        <MultiSelect
          id="devices"
          v-model="selectedDevices"
          :options="devices"
          optionLabel="hostname"
          optionValue="id"
          placeholder="Select target devices"
          :error="runSubmitted && selectedDevices.length === 0 ? 'Select at least one device.' : ''"
        />
      </div>
    </OFScriptDialog>

    <!-- Delete Script Confirmation -->
    <OFConfirmationDialog
      v-model="deleteScriptDialog" 
      header="Confirm"
      icon="pi pi-exclamation-triangle"
      confirmLabel="Yes"
      cancelLabel="No"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteScriptDialog = false"
    >
      <span v-if="selectedScript">
        Are you sure you want to delete <b>{{ selectedScript.name }}</b>?
      </span>
    </OFConfirmationDialog>
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
// Import from our new UI component library
import { 
  OFButton, 
  Column, 
  InputText, 
  Dropdown, 
  MultiSelect, 
  Tag,
  ScriptEditor,
  OFScriptDialog,
  OFConfirmationDialog,
  TooltipDirective
} from "../../components/ui";

// Register the tooltip directive
const vTooltip = TooltipDirective;

interface Script {
  id: string;
  name: string;
  type: string;
  description: string;
  content: string;
  created_at: string;
  last_run?: string;
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

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
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
  { name: 'Batch', value: 'batch' },
  { name: 'Shell', value: 'shell' },
  { name: 'Python', value: 'python' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatScriptType = (type: string) => {
  const typeMap: Record<string, string> = {
    powershell: 'PowerShell',
    batch: 'Batch',
    shell: 'Shell',
    python: 'Python'
  };
  return typeMap[type] || type;
};

const getScriptIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    powershell: 'pi pi-window-maximize',
    batch: 'pi pi-terminal',
    shell: 'pi pi-terminal',
    python: 'pi pi-code'
  };
  return iconMap[type] || 'pi pi-code';
};

const getScriptTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    powershell: 'info',
    batch: 'warning',
    shell: 'warning',
    python: 'success'
  };
  return severityMap[type] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const fetchScripts = async () => {
  try {
    loading.value = true;
    const response = await restClient.get<ScriptsResponse>(`${API_URL}/scripts/`);
    scripts.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch scripts:', error);
    toastService.showError('Failed to fetch scripts');
  } finally {
    loading.value = false;
  }
};

const fetchDevices = async () => {
  try {
    const response = await restClient.get<DevicesResponse>(`${API_URL}/agents/`);
    devices.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch devices:', error);
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
  try {
    submitted.value = true;
    if (!validateScript()) return;

    submitting.value = true;
    const endpoint = isEditMode.value && selectedScript.value ? 
      `${API_URL}/scripts/${selectedScript.value.id}` : 
      `${API_URL}/scripts`;

    const method = isEditMode.value ? 'put' : 'post';
    await restClient[method](endpoint, newScript.value);

    hideDialog();
    await fetchScripts();
    toastService.showSuccess(`Script ${isEditMode.value ? 'updated' : 'created'} successfully`);
  } catch (error) {
    console.error('Failed to save script:', error);
    toastService.showError(`Failed to ${isEditMode.value ? 'update' : 'create'} script`);
  } finally {
    submitting.value = false;
  }
};

const runScript = async (script: Script) => {
  selectedScript.value = script;
  showRunScriptDialog.value = true;
};

const executeScript = async () => {
  if (!selectedScript.value || selectedDevices.value.length === 0) return;

  try {
    runSubmitted.value = true;
    if (selectedDevices.value.length === 0) return;

    executing.value = true;
    await restClient.post(`${API_URL}/scripts/${selectedScript.value.id}/run`, {
      device_ids: selectedDevices.value
    });

    showRunScriptDialog.value = false;
    selectedDevices.value = [];
    await fetchScripts();
    toastService.showSuccess('Script execution started');
  } catch (error) {
    console.error('Failed to run script:', error);
    toastService.showError('Failed to run script');
  } finally {
    executing.value = false;
    runSubmitted.value = false;
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

const deleteScript = async (script: Script) => {
  try {
    await restClient.delete(`${API_URL}/scripts/${script.id}`);
    await fetchScripts();
    deleteScriptDialog.value = false;
    toastService.showSuccess('Script deleted successfully');
  } catch (error) {
    console.error('Failed to delete script:', error);
    toastService.showError('Failed to delete script');
  }
};

const confirmDelete = async () => {
  if (!selectedScript.value) return;

  deleting.value = true;
  try {
    await deleteScript(selectedScript.value);
  } catch (error) {
    console.error('Failed to delete script:', error);
    toastService.showError('Failed to delete script');
  } finally {
    deleting.value = false;
  }
};

const validateScript = () => {
  if (!newScript.value.name || !newScript.value.type || 
      !newScript.value.description || !newScript.value.content) {
    return false;
  }
  return true;
};

onMounted(async () => {
  await Promise.all([
    fetchScripts(),
    fetchDevices()
  ]);
});
</script>

<style scoped>
.of-scripts-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.of-scripts-content {
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

/* Dialog styles are now handled by OFScriptDialog and OFConfirmationDialog components */

.of-script-icon {
  font-size: 1.125rem;
  color: var(--primary-color);
}

.of-font-mono {
  font-family: monospace;
}
</style>                              