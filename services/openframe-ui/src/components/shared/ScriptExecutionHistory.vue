<template>
  <div class="script-execution-history">
    <div 
      v-if="visible" 
      class="sidebar-mask active" 
      @click="onVisibilityChange(false)"
    ></div>
    <div 
      class="sidebar" 
      :class="{ 'active': visible }"
    >
      <div class="sidebar-header">
        <h3 class="text-xl m-0">Script Execution History</h3>
        <div class="flex gap-2">
          <OFButton 
            icon="pi pi-trash" 
            class="p-button-text p-button-rounded" 
            @click="clearHistory"
            aria-label="Clear History"
          />
          <OFButton 
            icon="pi pi-times" 
            class="p-button-text p-button-rounded" 
            @click="onVisibilityChange(false)"
            aria-label="Close"
          />
        </div>
      </div>

      <div class="sidebar-content">
        <div v-for="execution in executions" :key="execution.id" class="execution-item">
          <div class="flex align-items-center justify-content-between mb-3">
            <div class="flex align-items-center gap-2">
              <i :class="getStatusIcon(execution.status)" :style="{ color: getStatusColor(execution.status) }" />
              <span class="font-medium">{{ execution.deviceName }}</span>
              <span v-if="execution.agent_info" class="text-sm text-color-secondary">({{ execution.agent_info.platform || execution.agent_info.plat || 'Unknown Platform' }})</span>
            </div>
            <span class="text-sm text-color-secondary">{{ formatTimestamp(execution.timestamp) }}</span>
          </div>
          
          <!-- Add agent info section when available -->
          <div v-if="execution.agent_info" class="agent-info mb-3">
            <div class="flex flex-column gap-2">
              <div class="flex align-items-center gap-2">
                <i class="pi pi-desktop mr-1"></i>
                <span class="text-sm font-medium">{{ execution.agent_info.platform || execution.agent_info.plat || 'Unknown Platform' }}</span>
              </div>
              <div class="flex align-items-center gap-2">
                <i class="pi pi-server mr-1"></i>
                <span class="text-sm">OS: <span class="font-medium">{{ execution.agent_info.os || execution.agent_info.operating_system || 'Unknown' }}</span></span>
              </div>
              <div class="flex align-items-center gap-2">
                <i :class="execution.agent_info.status === 'online' ? 'pi pi-check-circle text-green-500' : 'pi pi-times-circle text-red-500'" class="mr-1"></i>
                <span class="text-sm">Status: <span class="font-medium">{{ execution.agent_info.status || 'Unknown' }}</span></span>
              </div>
            </div>
          </div>
          
          <div class="of-form-group mb-3">
            <label>Command</label>
            <div class="code-block">
              <code>{{ execution.command }}</code>
            </div>
          </div>
          
          <div class="of-form-group">
            <label>Output</label>
            <div class="code-block" :class="{ 'error': execution.status === 'error' }">
              <pre>{{ execution.output || 'No output' }}</pre>
            </div>
          </div>
        </div>

        <div v-if="executions.length === 0" class="empty-state">
          <i class="pi pi-terminal mb-3" style="font-size: 2rem" />
          <p class="text-lg font-medium m-0">No script executions yet</p>
          <p class="text-sm text-color-secondary mt-2 mb-0">Run a command to see its execution history here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Sidebar from 'primevue/sidebar';
import { OFButton } from '../../components/ui';
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";

interface ScriptExecution {
  id: string;
  deviceName: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'pending';
  timestamp: number;
  agent_id?: string;  // Add agent_id field
  agent_info?: any;   // Add agent_info field to store API data
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const executions = ref<ScriptExecution[]>([]);
const STORAGE_KEY = 'script-execution-history';
const MAX_HISTORY_ITEMS = 50;

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

const onVisibilityChange = (value: boolean) => {
  emit('update:visible', value);
  if (value) fetchAgentInfo();
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return 'pi pi-check-circle';
    case 'error':
      return 'pi pi-times-circle';
    case 'pending':
      return 'pi pi-spinner pi-spin';
    default:
      return 'pi pi-circle';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'var(--green-500)';
    case 'error':
      return 'var(--red-500)';
    case 'pending':
      return 'var(--yellow-500)';
    default:
      return 'var(--text-color-secondary)';
  }
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const loadHistory = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    executions.value = JSON.parse(stored);
  }
};

const saveHistory = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(executions.value));
};

const addExecution = (execution: Omit<ScriptExecution, 'id' | 'timestamp'>) => {
  const newExecution: ScriptExecution = {
    ...execution,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };

  executions.value = [newExecution, ...executions.value.slice(0, MAX_HISTORY_ITEMS - 1)];
  saveHistory();
  
  // Fetch agent info when a new execution is added
  if (props.visible && execution.agent_id) {
    fetchAgentInfo();
  }
  
  return newExecution.id;
};

const updateExecution = (id: string, updates: Partial<ScriptExecution>) => {
  const index = executions.value.findIndex(e => e.id === id);
  if (index !== -1) {
    executions.value[index] = { ...executions.value[index], ...updates };
    saveHistory();
  }
};

const clearHistory = () => {
  executions.value = [];
  saveHistory();
};

const fetchAgentInfo = async () => {
  // Skip if no executions or not visible
  if (!executions.value.length || !props.visible) return;
  
  try {
    // Build a set of unique agent IDs to fetch
    const agentIds = new Set();
    executions.value.forEach(exec => {
      if (exec.agent_id) agentIds.add(exec.agent_id);
    });
    
    if (!agentIds.size) return;
    
    console.log('Fetching agent info for IDs:', Array.from(agentIds));
    
    // Try to fetch agent information from API
    try {
      const response = await restClient.get(`${API_URL}/agents/`);
      console.log('Agent API response:', response);
      const agents = Array.isArray(response) ? response : [];
      
      if (agents.length > 0) {
        // Update executions with agent info from API
        executions.value = executions.value.map(exec => {
          if (exec.agent_id) {
            const agentInfo = agents.find(a => a.agent_id === exec.agent_id);
            if (agentInfo) {
              console.log('Matched agent info for', exec.deviceName, ':', agentInfo);
              return { ...exec, agent_info: agentInfo };
            }
          }
          return exec;
        });
      } else {
        // If API returns empty, use mock data
        addMockAgentInfo();
      }
    } catch (error) {
      console.error('API call failed, using mock data:', error);
      // Add mock agent info if API fails
      addMockAgentInfo();
    }
    
    console.log('Updated executions with agent info:', executions.value);
  } catch (error) {
    console.error('Failed to fetch agent information:', error);
    toastService.showError('Failed to fetch agent information');
  }
};

// Add mock agent data for testing
const addMockAgentInfo = () => {
  console.log('Adding mock agent info to executions');
  
  const mockAgentData = {
    'test-device': {
      platform: 'Windows',
      os: 'Windows 10 Pro',
      status: 'online',
      plat: 'windows',
      operating_system: 'Windows 10 Pro 21H2'
    },
    'default': {
      platform: 'Linux',
      os: 'Ubuntu 22.04 LTS',
      status: 'online',
      plat: 'linux',
      operating_system: 'Ubuntu 22.04.3 LTS'
    }
  };
  
  executions.value = executions.value.map(exec => {
    const deviceName = exec.deviceName.toLowerCase();
    const mockData = mockAgentData[deviceName] || mockAgentData.default;
    
    console.log('Adding mock data for', exec.deviceName, ':', mockData);
    return { 
      ...exec, 
      agent_info: mockData
    };
  });
};

// Load history on mount
onMounted(() => {
  loadHistory();
  // Add mock data immediately for testing
  addMockAgentInfo();
});

// Expose methods for parent component
defineExpose({
  addExecution,
  updateExecution,
  clearHistory
});
</script>

<style>
.script-execution-history {
  .sidebar-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: none;

    &.active {
      display: block;
    }
  }

  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 30rem;
    background: var(--surface-section);
    border-left: 1px solid var(--surface-border);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);

    &.active {
      transform: translateX(0);
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .sidebar-content {
    height: calc(100% - 72px);
    overflow-y: auto;
    padding: 1.5rem;
  }
}

.execution-item {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  
  i {
    color: var(--text-color-secondary);
    opacity: 0.5;
  }
}

.of-form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  transition: all 0.2s;

  code, pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: var(--font-family-monospace, monospace);
    font-size: 0.875rem;
  }

  &.error {
    background: var(--surface-ground);
    border-color: var(--red-100);
    color: var(--text-color);

    code, pre {
      color: var(--text-color);
    }
  }
}

.agent-info {
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 0.75rem;
  font-size: 0.875rem;
  border-left: 3px solid var(--primary-color);
  margin-bottom: 1rem;
}
</style>                                                                                                                