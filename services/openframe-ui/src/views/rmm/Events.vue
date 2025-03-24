<template>
  <div class="of-scripts-view">
    <ModuleHeader title="Events">
      <template #subtitle>View system and device event history</template>
      <template #actions>
        <OFButton 
          icon="pi pi-sync" 
          :class="[
            'p-button-sm', 
            autoPollingEnabled ? 'p-button-warning' : 'p-button-text'
          ]"
          :style="autoPollingEnabled ? 'background-color: var(--of-primary) !important; border-color: var(--of-primary) !important; color: black !important; font-weight: bold !important;' : ''"
          @click="togglePolling(!autoPollingEnabled)" 
          v-tooltip.top="autoPollingEnabled ? 'Disable Auto Refresh' : 'Enable Auto Refresh'" />
      </template>
    </ModuleHeader>

    <div class="of-scripts-content">
      <div class="of-filters-container">
        <div class="of-filters-row">
          <div class="of-search-container">
            <SearchBar v-model="filters.global.value" placeholder="Search events..." />
          </div>
          <div class="of-filter-item">
            <Dropdown
              v-model="selectedAgent"
              :options="agentOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Agents"
              class="w-full"
            />
          </div>
          <div class="of-filter-item">
            <Dropdown
              v-model="filters.type.value"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Types"
              class="w-full"
            />
          </div>
        </div>
      </div>
      <ModuleTable 
        :items="historyItems" 
        :loading="loading"
        :searchFields="['command', 'username', 'type', 'time', 'script_name', 'execution_time']"
        emptyIcon="pi pi-history"
        emptyTitle="No History Items"
        emptyMessage="No history items are available."
        emptyHint="History items will appear here as commands and scripts are executed."
        :filters="filters">
        <Column field="time" header="Execution Time" sortable style="width: 15%">
          <template #body="{ data }">
            {{ formatTime(data.time) }}
          </template>
        </Column>
        <Column field="type" header="Type" sortable style="width: 10%">
          <template #body="{ data }">
            <Tag :value="formatType(data.type)" :severity="getTypeSeverity(data.type)" />
          </template>
        </Column>
        <Column field="command" header="Command/Script" sortable style="width: 45%">
          <template #body="{ data }">
            {{ data.script_name || data.command }}
          </template>
        </Column>
        <Column v-if="selectedAgent === null" field="agent" header="Agent" sortable style="width: 25%">
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getDeviceIcon(data.agent_info?.plat)" class="mr-2"></i>
              <div class="flex flex-column">
                <div>{{ data.agent_info?.hostname || getAgentHostname(data.agent) }}</div>
                <div class="text-xs text-color-secondary mt-1">
                  {{ data.agent_info ? (data.agent_info.os || data.agent_info.operating_system || 'Unknown OS') : '' }}
                </div>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Actions" :exportable="false" style="width: 10%">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Output'"
                @click="showOutputDialog(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Output Dialog -->
    <OFDialog
      v-if="selectedHistoryItem"
      v-model="showDialog"
      :header="getDialogTitle()"
      width="60vw"
    >
      <div v-if="selectedHistoryItem.type === 'cmd_run'" class="mb-4">
        <div class="of-form-group">
          <label>Command</label>
          <div class="code-block">
            <code>{{ selectedHistoryItem.command }}</code>
          </div>
        </div>
        

        
        <div class="of-form-group">
          <label>Output</label>
          <div class="code-block">
            <pre>{{ selectedHistoryItem.results || 'No output' }}</pre>
          </div>
        </div>
      </div>

      <div v-else-if="selectedHistoryItem.type === 'script_run'" class="mb-4">
        <div class="of-form-group">
          <label>Script</label>
          <div class="code-block">
            <code>{{ selectedHistoryItem.script_name }}</code>
          </div>
        </div>
        

        
        <div v-if="selectedHistoryItem.script_results" class="of-form-group">
          <label>Output</label>
          <div class="code-block">
            <pre>{{ selectedHistoryItem.script_results.stdout || 'No stdout output' }}</pre>
          </div>
        </div>
        <div v-if="selectedHistoryItem.script_results && selectedHistoryItem.script_results.stderr" class="of-form-group">
          <label>Error</label>
          <div class="code-block error">
            <pre>{{ selectedHistoryItem.script_results.stderr }}</pre>
          </div>
        </div>
        <div v-if="selectedHistoryItem.script_results" class="of-form-group">
          <label>Execution Details</label>
          <div class="execution-details">
            <div class="detail-item">
              <div class="detail-label">Exit Code</div>
              <div class="detail-value">{{ selectedHistoryItem.script_results.retcode }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Execution Time</div>
              <div class="detail-value">{{ selectedHistoryItem.script_results.execution_time.toFixed(2) }} sec</div>
            </div>
          </div>
        </div>
      </div>
    </OFDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick, watch } from "vue";
import { FilterMatchMode } from "primevue/api";
import DataTable from "primevue/datatable";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import { 
  OFButton, 
  OFDialog,
  Dropdown,
  Tag,
  Column
} from "../../components/ui";
import RadioButton from 'primevue/radiobutton';
import { HistoryEntry } from "../../types/rmm";

interface Device {
  id: string;
  agent_id: string;
  hostname: string;
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

const loading = ref(true);
const error = ref<Error | null>(null);
const devices = ref<Device[]>([]);
const selectedAgent = ref<string | null>(null);
const historyItems = ref<HistoryEntry[]>([]);
const previousHistoryItems = ref<HistoryEntry[]>([]);
const refreshInterval = ref<number | null>(null);
const showDialog = ref(false);
const selectedHistoryItem = ref<HistoryEntry | null>(null);
const autoPollingEnabled = ref(true); // Default to enabled

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  type: { value: null as string | null, matchMode: FilterMatchMode.EQUALS }
});

const typeOptions = [
  { label: 'All Types', value: null },
  { label: 'Command', value: 'cmd_run' },
  { label: 'Script', value: 'script_run' }
];

const agentOptions = computed(() => {
  return [
    { label: 'All Agents', value: null },
    ...devices.value.map(device => ({
      label: device.hostname,
      value: device.agent_id
    }))
  ];
});

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const formatExecutionTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatType = (type: string) => {
  return type === 'cmd_run' ? 'Command' : 'Script';
};

const getTypeSeverity = (type: string) => {
  return type === 'cmd_run' ? 'info' : 'success';
};

const getAgentHostname = (agentId: number) => {
  // First check if we have agent_info for this history item
  const historyItem = historyItems.value.find(item => item.agent === agentId);
  if (historyItem && historyItem.agent_info && historyItem.agent_info.hostname) {
    return historyItem.agent_info.hostname;
  }
  
  // Then try to find the device in the devices list
  const device = devices.value.find(d => d.id === agentId.toString());
  
  // Fall back to device hostname or default
  return device ? device.hostname : `Agent ${agentId}`;
};

const showOutputDialog = (historyItem: HistoryEntry) => {
  selectedHistoryItem.value = historyItem;
  
  // Don't add mock data in production
  // Mock data is now disabled by default
  
  showDialog.value = true;
};

const getDialogTitle = () => {
  if (!selectedHistoryItem.value) return 'Output Details';
  
  if (selectedHistoryItem.value.type === 'cmd_run') {
    return 'Command Output';
  } else {
    return `Script Output: ${selectedHistoryItem.value.script_name}`;
  }
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const endpoint = `${API_URL}/agents/?_t=${timestamp}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching devices from endpoint:', endpoint);
    }
    
    // Make API request with timeout for better user experience
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    try {
      const response = await restClient.get<Device[]>(endpoint, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      devices.value = Array.isArray(response) ? response : [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched devices:', devices.value.length);
      }
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        console.warn('Devices fetch request timed out');
        toastService.showError('Request timed out. Please try again.');
      } else {
        throw requestError; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    loading.value = false;
  }
};

const fetchHistory = async () => {
  // Skip if already loading to prevent multiple simultaneous requests
  if (loading.value) return;
  
  try {
    loading.value = true;
    
    // No mock data - always fetch real data from API
    
    // Choose the right endpoint based on whether we're showing a single agent or all agents
    const endpoint = selectedAgent.value
      ? `${API_URL}/agents/${selectedAgent.value}/history/`
      : `${API_URL}/agents/history/`;
      
    // Use agents/history endpoint for all agents, specific agent/history for single agent
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const urlWithTimestamp = `${endpoint}?_t=${timestamp}`;
    
    // Log the actual URL for debugging
    console.log('Actual fetch URL:', urlWithTimestamp);
    
    // Add minimal debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching history from endpoint:', urlWithTimestamp);
    }
    
    // Make API request with timeout for better user experience
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    try {
      const response = await restClient.get<HistoryEntry[]>(urlWithTimestamp, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      let newHistory = Array.isArray(response) ? response : [];
      
      // Sort history items by time in descending order (most recent first)
      newHistory.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      // Enhance history with agent information if not already present
      if (newHistory.length > 0 && !newHistory.some(item => item.agent_info)) {
        try {
          const enhancedHistory = await enhanceHistoryWithAgentInfo(newHistory);
          if (enhancedHistory && Array.isArray(enhancedHistory)) {
            newHistory = enhancedHistory;
          }
        } catch (enhanceError) {
          console.warn('Failed to enhance history with agent info:', enhanceError);
        }
      }
      
      // Check if data has changed to avoid unnecessary updates
      if (hasDataChanged(newHistory, previousHistoryItems.value)) {
        // Use nextTick to ensure UI updates don't block rendering
        nextTick(() => {
          historyItems.value = newHistory;
          previousHistoryItems.value = [...newHistory]; // Create shallow copy
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Updated history items count:', historyItems.value.length);
          }
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.log('No changes in history data, skipping update');
      }
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        console.warn('History fetch request timed out');
        toastService.showError('Request timed out. Please try again.');
      } else {
        throw requestError; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Failed to fetch history:', error);
    toastService.showError('Failed to fetch history');
  } finally {
    loading.value = false;
  }
};

// Set up polling refresh interval
const setupRefreshInterval = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  refreshInterval.value = window.setInterval(() => {
    // Only fetch if auto-polling is enabled
    if (autoPollingEnabled.value) {
      // Use requestAnimationFrame to avoid blocking the UI thread
      window.requestAnimationFrame(() => {
        fetchHistory();
      });
    }
  }, 5000); // 5 second refresh interval
};

const togglePolling = (enabled: boolean) => {
  autoPollingEnabled.value = enabled;
  
  if (enabled) {
    setupRefreshInterval();
  } else if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

// Define hasDataChanged function at the component level
const hasDataChanged = (newData: HistoryEntry[], oldData: HistoryEntry[]) => {
  // Different lengths means the data has changed
  if (newData.length !== oldData.length) return true;
  
  // If both arrays are empty, nothing changed
  if (newData.length === 0) return false;
  
  // Check first and last items for quick comparison
  try {
    // Compare IDs only for efficiency
    if (!newData[0] || !oldData[0]) return true;
    const firstItemChanged = newData[0].id !== oldData[0].id;
    const lastItemChanged = newData[newData.length - 1].id !== oldData[oldData.length - 1].id;
    return firstItemChanged || lastItemChanged;
  } catch (e) {
    console.warn('Error comparing history items:', e);
    return true; // Assume change on error
  }
};

// Add watcher setup function
const setupWatchers = () => {
  // Watch for agent selection changes
  watch(selectedAgent, () => {
    fetchHistory();
  });

  // Watch for type filter changes - use a safer approach
  watch(() => {
    try {
      return filters.type?.value;
    } catch (e) {
      return null;
    }
  }, () => {
    fetchHistory();
  });

  // Watch for global search filter changes with debounce - use a safer approach
  let globalFilterTimeout: number | null = null;
  watch(() => {
    try {
      return filters.global?.value;
    } catch (e) {
      return null;
    }
  }, () => {
    if (globalFilterTimeout) {
      clearTimeout(globalFilterTimeout);
    }
    globalFilterTimeout = window.setTimeout(() => {
      fetchHistory();
      globalFilterTimeout = null;
    }, 300); // Debounce for 300ms
  });
};

onMounted(() => {
  // Initialize filters and set up watchers
  filters.value = {
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.EQUALS }
  };
  
  // Set up watchers for filter changes
  setupWatchers();
  
  // Fetch real data
  fetchDevices();
  fetchHistory();</old_str>

    // For production, fetch real data
    fetchDevices();
    fetchHistory();
    
    // Set up watchers after data is loaded
    setupWatchers();
  }
  
  if (autoPollingEnabled.value) {
    setupRefreshInterval();
  }
  
  // Override icon styles
  overrideIconStyles();
});

// Add function to enhance history items with agent information
const enhanceHistoryWithAgentInfo = async (history: HistoryEntry[]) => {
  try {
    // Skip if no history items
    if (!history || history.length === 0) {
      return history;
    }
    
    // Fetch all agents from the API
    const agents = await fetchAgentDetails();
    
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      console.warn('No agents found in API response');
      return history;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Enhancing history with agent info for', history.length, 'items');
    }
    
    // Map agent details to history items directly
    return history.map(item => {
      if (!item || typeof item.agent === 'undefined') return item;
      
      // Try to find a direct match by agent ID first
      const agent = agents.find(a => {
        // Try different ways to match agent IDs
        return (
          a.agent_id === item.agent || 
          a.agent === item.agent || 
          a.id === item.agent || 
          (typeof a.id === 'string' && a.id === item.agent.toString()) ||
          (typeof item.agent === 'string' && item.agent === a.id.toString())
        );
      });
      
      if (agent) {
        return { ...item, agent_info: agent };
      }
      
      // If no direct match, create a basic agent_info object
      return { 
        ...item, 
        agent_info: {
          hostname: `Agent ${item.agent}`,
          plat: 'unknown',
          os: 'Unknown OS'
        } 
      };
    });
  } catch (error) {
    console.error('Failed to enhance history with agent info:', error);
    return history;
  }
};

// Add a function to load mock data for testing
const loadMockData = () => {
  console.log('Loading mock data...');
  historyItems.value = [
    {
      id: 1,
      agent: 1,
      time: new Date().toISOString(),
      type: 'cmd_run',
      command: 'ls -la /var/log',
      results: 'total 1024\ndrwxr-xr-x 10 root root 4096 Mar 15 12:34 .\ndrwxr-xr-x 14 root root 4096 Mar 10 09:12 ..',
      username: 'admin',
      agent_info: {
        agent_id: 'agent1',
        hostname: 'test-server-1',
        plat: 'linux',
        os: 'Ubuntu 20.04',
        agent: 1
      }
    },
    {
      id: 2,
      agent: 2,
      time: new Date(Date.now() - 3600000).toISOString(),
      type: 'script_run',
      script_name: 'system_info.sh',
      script_results: {
        stdout: 'CPU: Intel Core i7\nMemory: 16GB\nDisk: 500GB SSD',
        stderr: '',
        retcode: 0,
        execution_time: 1.25
      },
      username: 'admin',
      agent_info: {
        agent_id: 'agent2',
        hostname: 'test-server-2',
        plat: 'windows',
        os: 'Windows Server 2019',
        agent: 2
      }
    }
  ];
};

// Function to override icon styles
const overrideIconStyles = () => {
  // No implementation needed
};

// Mock data functions are disabled in production
// This function is only used for local development testing
const getMockAgentInfo = (agentId: number) => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Mock data generation is disabled in production');
    return null;
  }
  
  if (agentId === 1) {
    return {
      agent_id: 'agent1',
      hostname: 'test-server-1',
      plat: 'linux',
      os: 'Ubuntu 20.04',
      agent: 1
    };
  } else if (agentId === 2) {
    return {
      agent_id: 'agent2',
      hostname: 'test-server-2',
      plat: 'windows',
      os: 'Windows Server 2019',
      agent: 2
    };
  }
  
  return null;
};

// Function to fetch agent details
const fetchAgentDetails = async () => {
  try {
    // Add query parameters to ensure we get fresh data
    const timestamp = new Date().getTime();
    const endpoint = `${API_URL}/agents/?_t=${timestamp}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching agent details from endpoint:', endpoint);
    }
    
    // Make API request with timeout for better user experience
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    try {
      const response = await restClient.get(endpoint, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      let agents = Array.isArray(response) ? response : [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Fetched ${agents.length} agents from API:`, 
          agents.map(a => ({ agent_id: a.agent_id, hostname: a.hostname })));
      }
      
      return agents;
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        console.warn('Agent details fetch request timed out');
        return [];
      } else {
        throw requestError; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Failed to fetch agent details:', error);
    return [];
  }
};

import { getDeviceIcon } from '../../utils/deviceUtils';

// Clean up interval when component is unmounted
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
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

/* Using standardized global pagination styling from App.vue */

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

:deep(.p-multiselect-panel) {
  .p-multiselect-header {
    display: none !important;
  }
  
  .p-multiselect-items {
    padding: 0;
  }

  .p-multiselect-item:first-child {
    display: none !important;
  }
}

:deep(.hidden) {
  display: none !important;
}

/* Output dialog styles */
.of-form-group {
  margin-bottom: 1.5rem;
}

.of-form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 600;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  transition: all 0.2s;
}

.code-block code,
.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--font-family-monospace, monospace);
  font-size: 0.875rem;
}

.code-block.error {
  background: var(--surface-ground);
  border-color: var(--red-100);
  color: var(--text-color);
}

.code-block.error code,
.code-block.error pre {
  color: var(--text-color);
}

.execution-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.detail-item {
  min-width: 150px;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Table cell styles for name and description */
:deep(.name-cell),
:deep(.description-cell) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  max-height: 3em; /* 2 lines * 1.5 line-height */
  word-break: break-word;
}

:deep(.name-cell) {
  max-width: 300px;
}

:deep(.description-cell) {
  max-width: 500px;
}

.custom-yellow-button {
  background-color: var(--of-primary) !important;
  border-color: var(--of-primary) !important;
  color: black !important;
  font-weight: bold !important;
  box-shadow: 0 0 0 2px var(--of-primary) !important;
  transform: scale(1.05) !important;
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

