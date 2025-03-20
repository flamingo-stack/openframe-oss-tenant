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
      <div class="of-filters-container">
        <div class="of-filters-row">
          <div class="of-search-container">
            <SearchBar v-model="filters['global'].value" placeholder="Search scripts..." />
          </div>
          <div class="of-filter-item">
            <Dropdown
              id="scriptTypeFilter"
              v-model="filters['script_type'].value"
              :options="scriptTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Types"
              class="w-full"
            />
          </div>
          <div class="of-filter-item">
            <Dropdown
              id="shellTypeFilter"
              v-model="filters['shell'].value"
              :options="shellOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Shells"
              class="w-full"
            />
          </div>
          <div class="of-filter-item">
            <MultiSelect
              id="platformFilter"
              v-model="filters['platforms'].value"
              :options="platformOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Platforms"
              class="w-full"
              display="chip"
            />
          </div>
        </div>
      </div>

      <ModuleTable 
        :items="filteredScripts" 
        :loading="loading"
        :searchFields="['name', 'script_type', 'description', 'shell']"
        emptyIcon="pi pi-code"
        emptyTitle="No Scripts Found"
        emptyMessage="Add your first script to start automating tasks."
        emptyHint="Scripts will appear here once they are created."
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <span class="font-medium">{{ data.name }}</span>
            </div>
          </template>
        </Column>

        <Column field="script_type" header="Type" sortable>
          <template #body="{ data }">
            <Tag :value="formatScriptType(data.script_type)" 
                 :severity="getScriptTypeSeverity(data.script_type)" />
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
                v-tooltip.top="'Run Script'"
                @click="runScript(data)" 
              />
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Script'"
                @click="viewScript(data)" 
              />
              <OFButton 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Script'"
                @click="editScript(data)" 
              />
              <OFButton 
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
      width="450px"
      icon="pi pi-exclamation-triangle"
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
import { ref, onMounted, computed } from "@vue/runtime-core";
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
  OFCodeBlock
} from "../../components/ui";

interface Script {
  id: string;
  name: string;
  script_type: string;
  description: string;
  content: string;
  script_body?: string;
  created_at: string;
  last_run?: string;
  shell: string;
  default_timeout: number;
  args: string[];
  run_as_user: boolean;
  env_vars: string[];
  supported_platforms: string[];
  category: string | null;
  syntax: string;
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
  script_type: 'userdefined',
  description: '',
  content: '',
  created_at: '',
  last_run: '',
  shell: 'shell',
  default_timeout: 90,
  args: [] as string[],
  run_as_user: false,
  env_vars: [] as string[],
  supported_platforms: [] as string[],
  category: null as string | null,
  syntax: '',
  filename: null,
  favorite: false,
  hidden: false
});

const scriptTypes = [
  { name: 'PowerShell', value: 'powershell' },
  { name: 'Batch', value: 'batch' },
  { name: 'Shell', value: 'shell' },
  { name: 'Python', value: 'python' }
];

const platformOptions = [
  { label: 'Windows', value: 'windows' },
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'darwin' }
];

const shellOptions = [
  { label: 'Shell', value: 'shell' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Batch', value: 'batch' },
  { label: 'Python', value: 'python' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  script_type: { value: null as string | null, matchMode: FilterMatchMode.EQUALS },
  shell: { value: null as string | null, matchMode: FilterMatchMode.EQUALS },
  platforms: { value: [] as string[], matchMode: FilterMatchMode.IN }
});

const scriptTypeOptions = [
  { label: 'All Types', value: null },
  { label: 'Built-in', value: 'builtin' },
  { label: 'User Defined', value: 'userdefined' }
];

const filteredScripts = computed(() => {
  let filtered = [...scripts.value];

  if (filters.value.global.value) {
    const searchValue = filters.value.global.value.toLowerCase();
    filtered = filtered.filter(script => 
      script.name.toLowerCase().includes(searchValue) ||
      script.description.toLowerCase().includes(searchValue) ||
      script.shell.toLowerCase().includes(searchValue) ||
      formatScriptType(script.script_type).toLowerCase().includes(searchValue)
    );
  }

  if (filters.value.script_type.value) {
    filtered = filtered.filter(script => 
      script.script_type === filters.value.script_type.value
    );
  }

  if (filters.value.shell.value) {
    filtered = filtered.filter(script => 
      script.shell === filters.value.shell.value
    );
  }

  if (filters.value.platforms.value.length > 0) {
    filtered = filtered.filter(script => 
      script.supported_platforms.some(platform => 
        filters.value.platforms.value.includes(platform)
      )
    );
  }

  return filtered;
});

const formatScriptType = (type: string) => {
  const typeMap: Record<string, string> = {
    builtin: 'Built-in',
    userdefined: 'User Defined'
  };
  return typeMap[type] || type;
};

const getScriptTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    builtin: 'info',
    userdefined: 'success'
  };
  return severityMap[type] || 'info';
};

const formatTimestamp = (timestamp: string) => {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
};

const fetchScripts = async () => {
  try {
    loading.value = true;
    const response = await restClient.get<Script[]>(`${API_URL}/scripts/`);
    scripts.value = response || [];
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
  selectedScript.value = null;
};

const saveScript = async (scriptData: any) => {
  try {
    submitting.value = true;
    const endpoint = isEditMode.value && selectedScript.value ? 
      `${API_URL}/scripts/${selectedScript.value.id}/` : 
      `${API_URL}/scripts/`;

    const payload = {
      name: scriptData.name,
      shell: scriptData.shell,
      default_timeout: scriptData.default_timeout,
      args: scriptData.args,
      script_body: scriptData.syntax,
      run_as_user: scriptData.run_as_user,
      env_vars: scriptData.env_vars,
      description: scriptData.description,
      supported_platforms: scriptData.supported_platforms,
      category: scriptData.category
    };

    const method = isEditMode.value ? 'put' : 'post';
    await restClient[method](endpoint, payload);

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

const viewScript = async (script: Script) => {
  if (script.script_type !== 'builtin') {
    toastService.showError('Only community scripts can be viewed');
    return;
  }

  try {
    const response = await restClient.get<Script>(`${API_URL}/scripts/${script.id}/`);
    if (!response) {
      throw new Error('No script data received');
    }
    selectedScript.value = {
      ...response,
      syntax: response.script_body || response.content || ''
    };
    isEditMode.value = false;
    showAddScriptDialog.value = true;
  } catch (error) {
    console.error('Failed to fetch script details:', error);
    toastService.showError('Failed to fetch script details');
    selectedScript.value = script;
    isEditMode.value = false;
    showAddScriptDialog.value = true;
  }
};

const editScript = async (script: Script) => {
  if (script.script_type !== 'userdefined') {
    toastService.showError('Only user-defined scripts can be edited');
    return;
  }
  
  try {
    const response = await restClient.get<Script>(`${API_URL}/scripts/${script.id}/`);
    if (!response) {
      throw new Error('No script data received');
    }
    selectedScript.value = {
      ...response,
      script_type: 'userdefined',
      syntax: response.script_body || response.content || ''
    };
    isEditMode.value = true;
    showAddScriptDialog.value = true;
  } catch (error) {
    console.error('Failed to fetch script details:', error);
    toastService.showError('Failed to fetch script details');
    selectedScript.value = {
      ...script,
      script_type: 'userdefined'
    };
    isEditMode.value = true;
    showAddScriptDialog.value = true;
  }
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
  if (!newScript.value.name || !newScript.value.shell || 
      !newScript.value.description || !newScript.value.syntax) {
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

.of-filters-container {
  margin-bottom: 1rem;
}

.of-filters-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  height: 42px;
}

.of-search-container {
  flex: 2;
  height: 100%;
}

.of-filter-item {
  flex: 1;
  min-width: 180px;
  height: 100%;
}

:deep(.p-dropdown),
:deep(.p-multiselect) {
  width: 100%;
  height: 100%;
  background: var(--surface-section);
  border: none;
}

:deep(.p-dropdown .p-dropdown-label),
:deep(.p-multiselect .p-multiselect-label) {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
}

:deep(.p-dropdown-trigger),
:deep(.p-multiselect-trigger) {
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-inputgroup) {
  height: 100%;
}

:deep(.p-inputgroup-addon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
}

:deep(.p-datatable) {
  background: var(--surface-card);
  border-radius: var(--border-radius);
}

:deep(.p-paginator-bottom) {
  border-top: 1px solid var(--surface-border);
}

:deep(.p-paginator) {
  background: var(--surface-card);
  padding: 1rem;
}

/* Dialog specific styles */
:deep(.p-dialog) {
  .p-dialog-mask {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .p-dialog-content {
    overflow-y: auto !important;
    max-height: calc(90vh - 120px) !important;
  }
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

/* Form input styles */
:deep(.p-dialog) {
  .p-multiselect,
  .p-inputnumber,
  .p-dropdown,
  .p-inputtext,
  .p-textarea {
    width: 100%;
  }

  .p-checkbox {
    margin-right: 0.5rem;
  }

  .p-multiselect {
    .p-multiselect-label {
      padding: 0.5rem;
    }

    .p-multiselect-token {
      margin: 0.25rem;
      padding: 0.25rem 0.5rem;
    }
  }
}
</style>                            