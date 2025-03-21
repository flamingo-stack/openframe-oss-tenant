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
          <div class="operation-type-container">
            <div 
              class="operation-type-option" 
              :class="{ 'selected': operationType === 'script', 'p-invalid': submitted && !operationType }"
              @click="operationType = 'script'"
            >
              <RadioButton 
                id="operationType_script" 
                v-model="operationType" 
                value="script" 
              />
              <label for="operationType_script" class="operation-type-label">
                <i class="pi pi-code operation-type-icon"></i>
                <span>Script</span>
              </label>
            </div>
            <div 
              class="operation-type-option" 
              :class="{ 'selected': operationType === 'command', 'p-invalid': submitted && !operationType }"
              @click="operationType = 'command'"
            >
              <RadioButton 
                id="operationType_command" 
                v-model="operationType" 
                value="command" 
              />
              <label for="operationType_command" class="operation-type-label">
                <i class="pi pi-terminal operation-type-icon"></i>
                <span>Command</span>
              </label>
            </div>
          </div>
          <small class="p-error" v-if="submitted && !operationType">
            Operation type is required.
          </small>
        </div>
      </div>

      <!-- Script Execution Form -->
      <div v-if="operationType === 'script'" class="of-bulk-script-form p-card p-p-4">
        <h3>Bulk Script Execution</h3>
        
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
        
        <div class="of-form-group p-mt-3">
          <OFButton 
            label="Configure Script" 
            icon="pi pi-cog" 
            class="p-button-secondary" 
            @click="openScriptDialog"
          />
        </div>
        
        <div v-if="bulkArgs.length > 0 || bulkEnvVars.length > 0" class="of-form-group p-mt-3">
          <div v-if="bulkArgs.length > 0" class="p-mb-2">
            <label class="of-form-label">Script Arguments</label>
            <div class="script-params-preview">
              <div v-for="(arg, index) in bulkArgs" :key="`arg-${index}`" class="p-chip p-mr-2 p-mb-2">
                {{ arg }}
              </div>
            </div>
          </div>
          
          <div v-if="bulkEnvVars.length > 0" class="p-mt-2">
            <label class="of-form-label">Environment Variables</label>
            <div class="script-params-preview">
              <div v-for="(env, index) in bulkEnvVars" :key="`env-${index}`" class="p-chip p-mr-2 p-mb-2">
                {{ env }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Script Dialog -->
      <ScriptDialog
        v-model="scriptDialogVisible"
        :isEditMode="false"
        :submitting="false"
        :initialData="scriptDialogData"
        @confirm="handleScriptDialogConfirm"
        @cancel="scriptDialogVisible = false"
      />

      <!-- Command Execution Form -->
      <div v-if="operationType === 'command'" class="of-bulk-command-form p-card p-p-4">
        <h3>Bulk Command Execution</h3>
        
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
        
        <div class="of-form-group p-mt-3">
          <OFButton 
            label="Configure Command" 
            icon="pi pi-terminal" 
            class="p-button-secondary" 
            @click="openCommandDialog"
          />
        </div>
        
        <div v-if="command" class="of-form-group p-mt-3">
          <label class="of-form-label">Command to Execute</label>
          <div class="command-preview">{{ command }}</div>
        </div>
        
        <div class="of-form-group">
          <div class="p-field-checkbox">
            <Checkbox v-model="bulkRunAsUser" :binary="true" id="runAsUser" />
            <label for="runAsUser">Run As User</label>
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
      
      <!-- Command Dialog -->
      <CommandDialog
        :visible="commandDialogVisible"
        :lastCommand="commandDialogData"
        @update:visible="commandDialogVisible = $event"
        @run="handleCommandDialogRun"
        @cancel="commandDialogVisible = false"
      />

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
import ScriptDialog from './components/ScriptDialog.vue';
import CommandDialog from '../../components/shared/CommandDialog.vue';
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

// Dialog state
const scriptDialogVisible = ref(false);
const commandDialogVisible = ref(false);
const scriptDialogData = ref({
  id: null,
  name: '',
  description: '',
  shell: 'powershell',
  args: [] as string[],
  category: null as string | null,
  favorite: false,
  default_timeout: 90,
  syntax: '',
  filename: null,
  hidden: false,
  supported_platforms: [] as string[],
  run_as_user: false,
  env_vars: [] as string[],
  script_type: 'userdefined'
});
const commandDialogData = ref({
  cmd: '',
  output: ''
});

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

// Script Dialog Methods
const openScriptDialog = () => {
  // Find the selected script if one is selected
  if (bulkSelectedScript.value) {
    const selectedScript = scripts.value.find(s => parseInt(s.id) === bulkSelectedScript.value);
    if (selectedScript) {
      scriptDialogData.value = {
        id: parseInt(selectedScript.id),
        name: selectedScript.name,
        description: selectedScript.description,
        shell: selectedScript.shell || 'powershell',
        args: bulkArgs.value.length ? bulkArgs.value : selectedScript.args || [],
        category: selectedScript.category,
        favorite: false,
        default_timeout: bulkTimeout.value || selectedScript.default_timeout || 90,
        syntax: selectedScript.content || selectedScript.syntax || '',
        filename: null,
        hidden: false,
        supported_platforms: selectedScript.supported_platforms || [],
        run_as_user: bulkRunAsUser.value,
        env_vars: bulkEnvVars.value.length ? bulkEnvVars.value : selectedScript.env_vars || [],
        script_type: selectedScript.script_type || 'userdefined'
      };
    }
  }
  
  scriptDialogVisible.value = true;
};

const handleScriptDialogConfirm = (data) => {
  // Update bulk operation with script dialog data
  bulkArgs.value = data.args || [];
  bulkEnvVars.value = data.env_vars || [];
  bulkRunAsUser.value = data.run_as_user;
  bulkTimeout.value = data.default_timeout;
  
  scriptDialogVisible.value = false;
};

// Command Dialog Methods
const openCommandDialog = () => {
  commandDialogData.value = {
    cmd: command.value,
    output: ''
  };
  
  commandDialogVisible.value = true;
};

const handleCommandDialogRun = async (commandStr) => {
  command.value = commandStr;
  commandDialogVisible.value = false;
  return "Command prepared for bulk execution";
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

/* Operation Type Styles */
.operation-type-container {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.operation-type-option {
  display: flex;
  align-items: center;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.operation-type-option:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.operation-type-option.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.operation-type-option.selected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background-color: var(--primary-color);
}

.operation-type-option.p-invalid {
  border-color: var(--red-500);
}

.operation-type-label {
  display: flex;
  align-items: center;
  margin-left: 0.75rem;
  cursor: pointer;
  color: var(--text-color);
  font-weight: 600;
}

.operation-type-icon {
  margin-right: 0.75rem;
  font-size: 1.5rem;
  color: var(--text-color-secondary);
}

.operation-type-option.selected .operation-type-icon {
  color: var(--primary-color);
}

.operation-type-option.selected .operation-type-label {
  color: var(--text-color);
}

.command-preview {
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  color: var(--text-color);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.script-params-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
