<template>
  <div class="of-bulk-ops-view">
    <ModuleHeader title="Bulk Operations">
      <template #actions>
        <!-- No actions in header for this view -->
      </template>
    </ModuleHeader>

    <div class="of-bulk-ops-content">
      <div class="of-bulk-ops-selection p-mb-4">
        <div class="of-form-group">
          <label class="of-form-label">Operation Type</label>
          <div class="of-operation-options">
            <div 
              class="status-option" 
              :class="{ active: operationType === 'script' }" 
              @click="operationType = 'script'"
            >
              <div class="radio-button">
                <div class="radio-inner"></div>
              </div>
              <div class="status-label">
                <span class="status-title">Script</span>
                <span class="status-description">Execute a predefined script</span>
              </div>
            </div>
            <div 
              class="status-option" 
              :class="{ active: operationType === 'command' }" 
              @click="operationType = 'command'"
            >
              <div class="radio-button">
                <div class="radio-inner"></div>
              </div>
              <div class="status-label">
                <span class="status-title">Command</span>
                <span class="status-description">Execute a custom command</span>
              </div>
            </div>
          </div>
          <small class="p-error" v-if="submitted && !operationType">
            Operation type is required.
          </small>
        </div>
      </div>

      <!-- Script Execution Form -->
      <div v-if="operationType === 'script'" class="of-bulk-form p-card p-4">
        
        <div class="of-form-group">
          <label for="bulkScript" class="of-form-label">Select Script</label>
          <Dropdown
            id="bulkScript"
            v-model="bulkSelectedScript"
            :options="scriptOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a script"
            class="w-full"
            :class="{ 'p-invalid': submitted && !bulkSelectedScript }"
          />
          <small class="p-error" v-if="submitted && !bulkSelectedScript">
            Script selection is required.
          </small>
        </div>
        
        <div class="of-form-group">
          <label for="bulkAgents" class="of-form-label">Target Agents</label>
          <MultiSelect
            id="bulkAgents"
            v-model="bulkSelectedAgents"
            :options="devices"
            optionLabel="hostname"
            optionValue="id"
            placeholder="Select target agents"
            class="w-full"
            :class="{ 'p-invalid': submitted && bulkSelectedAgents.length === 0 }"
          />
          <small class="p-error" v-if="submitted && bulkSelectedAgents.length === 0">
            Select at least one agent.
          </small>
        </div>
        
        <div class="of-form-group">
          <label class="of-form-label">OS Type</label>
          <Dropdown
            v-model="bulkOsType"
            :options="[
              { label: 'Windows', value: 'windows' },
              { label: 'Linux', value: 'linux' },
              { label: 'macOS', value: 'darwin' },
              { label: 'All', value: 'all' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="Select OS type"
            class="w-full"
          />
        </div>
        
        <div class="of-form-group">
          <label class="of-form-label">Script Arguments</label>
          <div class="p-inputgroup">
            <InputText
              id="scriptArg"
              v-model="newArg"
              placeholder="Add argument and press Enter"
              @keydown.enter.prevent="addScriptArg(newArg); newArg = ''"
            />
            <OFButton icon="pi pi-plus" class="p-button-text" @click="addScriptArg(newArg); newArg = ''" />
          </div>
          <div v-if="bulkArgs.length > 0" class="p-mt-2">
            <div v-for="(arg, index) in bulkArgs" :key="index" class="p-chip p-mr-2 p-mb-2">
              {{ arg }}
              <i class="pi pi-times p-chip-remove-icon" @click="removeScriptArg(index)"></i>
            </div>
          </div>
        </div>
        
        <div class="of-form-group">
          <label class="of-form-label">Environment Variables</label>
          <div class="p-inputgroup">
            <InputText
              id="envVar"
              v-model="newEnvVar"
              placeholder="KEY=VALUE format and press Enter"
              @keydown.enter.prevent="addEnvVar(newEnvVar); newEnvVar = ''"
            />
            <OFButton icon="pi pi-plus" class="p-button-text" @click="addEnvVar(newEnvVar); newEnvVar = ''" />
          </div>
          <div v-if="bulkEnvVars.length > 0" class="p-mt-2">
            <div v-for="(env, index) in bulkEnvVars" :key="index" class="p-chip p-mr-2 p-mb-2">
              {{ env }}
              <i class="pi pi-times p-chip-remove-icon" @click="removeEnvVar(index)"></i>
            </div>
          </div>
        </div>
        
        <div class="of-form-group checkbox-group mb-3">
          <div class="checkbox-container">
            <Checkbox id="runAsUser" v-model="bulkRunAsUser" :binary="true" />
            <label for="runAsUser" class="checkbox-label">Run As User (Windows only)</label>
          </div>
        </div>
        
        <div class="of-form-group">
          <label for="timeout" class="of-form-label">Timeout (seconds)</label>
          <InputText
            id="timeout"
            v-model.number="bulkTimeout"
            type="number"
            style="width: 150px"
          />
        </div>
      </div>

      <!-- Command Execution Form -->
      <div v-if="operationType === 'command'" class="of-bulk-form p-card p-4">
        
        <div class="of-form-group">
          <label for="bulkAgents" class="of-form-label">Target Agents</label>
          <MultiSelect
            id="bulkAgents"
            v-model="bulkSelectedAgents"
            :options="devices"
            optionLabel="hostname"
            optionValue="id"
            placeholder="Select target agents"
            class="w-full"
            :class="{ 'p-invalid': submitted && bulkSelectedAgents.length === 0 }"
          />
          <small class="p-error" v-if="submitted && bulkSelectedAgents.length === 0">
            Select at least one agent.
          </small>
        </div>
        
        <div class="of-form-group">
          <label class="of-form-label">OS Type</label>
          <Dropdown
            v-model="bulkOsType"
            :options="[
              { label: 'Windows', value: 'windows' },
              { label: 'Linux', value: 'linux' },
              { label: 'macOS', value: 'darwin' },
              { label: 'All', value: 'all' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="Select OS type"
            class="w-full"
          />
        </div>
        
        <div class="of-form-group">
          <label for="shellType" class="of-form-label">Shell Type</label>
          <Dropdown
            id="shellType"
            v-model="shellType"
            :options="[
              { label: 'CMD', value: 'cmd' },
              { label: 'PowerShell', value: 'powershell' },
              { label: 'Bash', value: 'bash' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="Select shell type"
            class="w-full"
          />
        </div>
        
        <div class="of-form-group">
          <label for="command" class="of-form-label">Command</label>
          <Textarea
            id="command"
            v-model="command"
            rows="5"
            class="w-full"
            placeholder="Enter command to execute"
            :class="{ 'p-invalid': submitted && !command }"
          />
          <small class="p-error" v-if="submitted && !command">
            Command is required.
          </small>
        </div>
        
        <div class="of-form-group checkbox-group mb-3">
          <div class="checkbox-container">
            <Checkbox id="runAsUser" v-model="bulkRunAsUser" :binary="true" />
            <label for="runAsUser" class="checkbox-label">Run As User (Windows only)</label>
          </div>
        </div>
        
        <div class="of-form-group">
          <label for="timeout" class="of-form-label">Timeout (seconds)</label>
          <InputText
            id="timeout"
            v-model.number="bulkTimeout"
            type="number"
            style="width: 150px"
          />
        </div>
      </div>

      <div class="of-bulk-ops-actions p-mt-4">
        <OFButton 
          label="Execute" 
          icon="pi pi-play"
          @click="executeBulkOperation"
          :loading="executing"
          class="p-button-primary"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import { 
  OFButton, 
  InputText, 
  Dropdown,
  MultiSelect,
  Textarea
} from "../../components/ui";
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Checkbox from 'primevue/checkbox';

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

interface DevicesResponse {
  data: Device[];
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

// Shared state
const loading = ref(true);
const executing = ref(false);
const submitted = ref(false);
const operationType = ref<string>('script');
const bulkSelectedAgents = ref<string[]>([]);
const bulkOsType = ref<string>('windows');
const bulkRunAsUser = ref<boolean>(false);
const bulkTimeout = ref<number>(90);

// Script execution state
const scripts = ref<Script[]>([]);
const devices = ref<Device[]>([]);
const bulkSelectedScript = ref<number | null>(null);
const bulkArgs = ref<string[]>([]);
const bulkEnvVars = ref<string[]>([]);
const newArg = ref('');
const newEnvVar = ref('');

// Command execution state
const shellType = ref<string>('cmd');
const command = ref<string>('');

const scriptOptions = computed(() => {
  return scripts.value.map(script => ({
    label: script.name,
    value: parseInt(script.id)
  }));
});

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

const addScriptArg = (value: string) => {
  if (value && !bulkArgs.value.includes(value)) {
    bulkArgs.value.push(value);
  }
};

const removeScriptArg = (index: number) => {
  bulkArgs.value.splice(index, 1);
};

const addEnvVar = (value: string) => {
  if (value && !bulkEnvVars.value.includes(value) && value.includes('=')) {
    bulkEnvVars.value.push(value);
  } else if (value && !value.includes('=')) {
    toastService.showWarning('Environment variables must be in KEY=VALUE format');
  }
};

const removeEnvVar = (index: number) => {
  bulkEnvVars.value.splice(index, 1);
};

const executeBulkOperation = async () => {
  submitted.value = true;
  
  if (operationType.value === 'script') {
    if (!bulkSelectedScript.value || bulkSelectedAgents.value.length === 0) {
      return;
    }
    
    await executeBulkScript();
  } else if (operationType.value === 'command') {
    if (!command.value || bulkSelectedAgents.value.length === 0) {
      return;
    }
    
    await executeBulkCommand();
  }
};

const executeBulkScript = async () => {
  try {
    executing.value = true;
    
    const payload = {
      mode: "script",
      target: "agents",
      monType: "all",
      osType: bulkOsType.value,
      cmd: "",
      shell: "cmd",
      custom_shell: null,
      custom_field: null,
      collector_all_output: false,
      save_to_agent_note: false,
      patchMode: "scan",
      offlineAgents: false,
      client: null,
      site: null,
      agents: bulkSelectedAgents.value,
      script: bulkSelectedScript.value,
      timeout: bulkTimeout.value,
      args: bulkArgs.value,
      env_vars: bulkEnvVars.value,
      run_as_user: bulkRunAsUser.value
    };
    
    await restClient.post(`${API_URL}/agents/actions/bulk/`, payload);
    
    resetForm();
    toastService.showSuccess('Bulk script execution started');
  } catch (error) {
    console.error('Failed to execute bulk script:', error);
    toastService.showError('Failed to execute bulk script');
  } finally {
    executing.value = false;
  }
};

const executeBulkCommand = async () => {
  try {
    executing.value = true;
    
    const payload = {
      mode: "command",
      target: "agents",
      monType: "all",
      osType: bulkOsType.value,
      cmd: command.value,
      shell: shellType.value,
      custom_shell: null,
      custom_field: null,
      collector_all_output: false,
      save_to_agent_note: false,
      patchMode: "scan",
      offlineAgents: false,
      client: null,
      site: null,
      agents: bulkSelectedAgents.value,
      timeout: bulkTimeout.value,
      run_as_user: bulkRunAsUser.value
    };
    
    await restClient.post(`${API_URL}/agents/actions/bulk/`, payload);
    
    resetForm();
    toastService.showSuccess('Bulk command execution started');
  } catch (error) {
    console.error('Failed to execute bulk command:', error);
    toastService.showError('Failed to execute bulk command');
  } finally {
    executing.value = false;
  }
};

const resetForm = () => {
  submitted.value = false;
  bulkSelectedScript.value = null;
  bulkSelectedAgents.value = [];
  bulkArgs.value = [];
  bulkEnvVars.value = [];
  command.value = '';
  newArg.value = '';
  newEnvVar.value = '';
};

onMounted(async () => {
  await Promise.all([
    fetchScripts(),
    fetchDevices()
  ]);
});
</script>

<style scoped>
.of-bulk-ops-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.of-bulk-ops-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.of-form-group {
  margin-bottom: 1.5rem;
}

.of-form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.p-chip {
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.of-bulk-ops-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

/* New styles for big push buttons (based on Policies.vue) */
.of-operation-options {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--border-radius);
  background: var(--surface-ground);
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  border: 1px solid transparent;
}

.status-option:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
}

.status-option.active {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.radio-button {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--surface-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.status-option.active .radio-button {
  border-color: var(--primary-color);
}

.radio-inner {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s ease;
}

.status-option.active .radio-inner {
  background: var(--primary-color);
}

.status-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-title {
  font-weight: 600;
  color: var(--text-color);
}

.status-description {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

/* Dark mode styles */
:deep([data-theme="dark"]) {
  .status-option.active {
    background: var(--yellow-900);
    border: 1px solid var(--yellow-500);
  }

  .status-option.active .radio-button {
    border-color: var(--yellow-500);
  }

  .status-option.active .radio-inner {
    background: var(--yellow-500);
  }
}

.of-bulk-form {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
  box-shadow: 0 2px 1px -1px rgba(0,0,0,0.2),
             0 1px 1px 0 rgba(0,0,0,0.14),
             0 1px 3px 0 rgba(0,0,0,0.12);
  margin-bottom: 1.5rem;
}

/* Checkbox styling */
.checkbox-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--border-radius);
  background: var(--surface-ground);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.checkbox-option:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
}

.checkbox-option.active {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.checkbox-button {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--surface-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.checkbox-option.active .checkbox-button {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.checkbox-inner {
  opacity: 0;
  width: 0.75rem;
  height: 0.75rem;
  transition: all 0.2s ease;
}

.checkbox-option.active .checkbox-inner {
  opacity: 1;
  background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

/* Dark mode support for checkboxes */
:deep([data-theme="dark"]) {
  .checkbox-option.active {
    background: var(--yellow-900);
    border: 1px solid var(--yellow-500);
  }

  .checkbox-option.active .checkbox-button {
    border-color: var(--yellow-500);
    background: var(--yellow-500);
  }
}

/* Checkbox styling */
.checkbox-group {
  margin-bottom: 0;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label {
  margin: 0;
  font-weight: normal;
}

/* Adjust OS type grid layout for better space utilization */
.of-operation-options {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  display: grid;
}
</style>
