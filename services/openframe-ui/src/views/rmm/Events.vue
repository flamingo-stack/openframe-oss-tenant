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
        :filters="filters"
      >
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
import { ref, onMounted, computed, onUnmounted, nextTick } from "vue";
import { FilterMatchMode } from "primevue/api";
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
    
    // No mock data in production
    if (window.location.hostname === 'localhost' && process.env.NODE_ENV === 'development' && false) {
      // Mock data is now disabled by default
      console.log('Development environment detected, but mock data is disabled');
      loading.value = false;
      return;
    }
    
    const response = await restClient.get<Device[]>(`${API_URL}/agents/`);
    devices.value = Array.isArray(response) ? response : [];
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
    
    let newHistory: HistoryEntry[] = [];
    
    // Only use mock data in development mode for local testing
    if (window.location.hostname === 'localhost' && process.env.NODE_ENV === 'development') {
      console.log('Development environment detected, but not using mock data by default');
      // Mock data is now only added via addMockAgentInfo() when explicitly called
    }
    
    // If no mock data or not in development mode, fetch from API
    if (newHistory.length === 0) {
      // Choose the right endpoint based on whether we're showing a single agent or all agents
      const endpoint = selectedAgent.value
        ? `${API_URL}/agents/${selectedAgent.value}/history/`
        : `${API_URL}/agents/history/`; // Assumes an endpoint exists for all agents' history
      
      const response = await restClient.get<HistoryEntry[]>(endpoint);
      newHistory = Array.isArray(response) ? response : [];
    }
    
    // Sort history items by time in descending order (most recent first)
    newHistory.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    
    // Enhance history with agent information if not already present
    if (!newHistory.some(item => item.agent_info)) {
      newHistory = await enhanceHistoryWithAgentInfo(newHistory);
    }
    
    // Verify agent data availability (only log in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Agent data verification:', newHistory.map(item => ({
        agent: item.agent,
        agent_info: item.agent_info ? {
          agent_id: item.agent_info.agent_id,
          hostname: item.agent_info.hostname,
          plat: item.agent_info.plat
        } : null,
        has_os: item.agent_info ? Boolean(item.agent_info.os || item.agent_info.operating_system) : false
      })));
    }
    
    // Only update the UI if data has changed
    if (JSON.stringify(newHistory) !== JSON.stringify(previousHistoryItems.value)) {
      // Use nextTick to ensure UI updates don't block rendering
      nextTick(() => {
        historyItems.value = newHistory;
        previousHistoryItems.value = JSON.parse(JSON.stringify(newHistory));
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Updated history items:', historyItems.value);
        }
      });
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
    // Use requestAnimationFrame to avoid blocking the UI thread
    window.requestAnimationFrame(() => {
      fetchHistory();
    });
  }, 5000); // Changed from 3000 to 5000 ms for less frequent updates
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

onMounted(() => {
  fetchDevices();
  fetchHistory();
  
  if (autoPollingEnabled.value) {
    setupRefreshInterval();
  }
  
  // Override icon styles
  overrideIconStyles();
  
  // Only add mock data when explicitly requested for testing
  // Mock data is now disabled by default
});

// Add function to enhance history items with agent information
const enhanceHistoryWithAgentInfo = async (history: HistoryEntry[]) => {
  try {
    // Fetch all agents from the API
    const agents = await fetchAgentDetails();
    
    if (agents.length === 0) {
      console.warn('No agents found in API response');
      return history;
    }
    
    console.log('Fetched agents:', agents.map(a => ({ agent_id: a.agent_id, hostname: a.hostname })));
    
    // Map agent details to history items directly (without relying on devices.value)
    return history.map(item => {
      // Based on the API response, we now know that agent ID 1 in history entries
      // maps to agent_id "PYUpjOssiHmALDSRbpGopBCpWNfAQpzECMYbKAuP" in the agents API
      if (agents.length > 0) {
        // For numeric agent ID 1, find the agent with agent.agent property equal to 1
        // This is the correct mapping based on the API response
        if (item.agent === 1) {
          // Try to find an agent with agent property equal to 1
          const agent = agents.find(a => a.agent === 1);
          if (agent) {
            return { ...item, agent_info: agent };
          }
          // If not found, use the first agent as fallback
          return { ...item, agent_info: agents[0] };
        }
        
        // For other agent IDs, try to find a matching agent if possible
        const agent = agents.find(a => a.agent === item.agent);
        if (agent) {
          return { ...item, agent_info: agent };
        }
        
        // Fallback to index-based mapping if no direct match found
        const agentIndex = (item.agent - 1) % agents.length;
        const fallbackAgent = agents[agentIndex >= 0 ? agentIndex : 0];
        if (fallbackAgent) {
          return { ...item, agent_info: fallbackAgent };
        }
      }
      
      return item;
    });
  } catch (error) {
    console.error('Failed to enhance history with agent info:', error);
    return history;
  }
};

// Function to fetch agent details
const fetchAgentDetails = async () => {
  try {
    const response = await restClient.get(`${API_URL}/agents/`);
    const agents = Array.isArray(response) ? response : [];
    console.log(`Fetched ${agents.length} agents from API`);
    return agents;
  } catch (error) {
    console.error('Failed to fetch agent details:', error);
    return [];
  }
};

// Mock data functions are disabled in production
// Function to generate mock agent data for local development (disabled)
const getMockAgentInfo = (agentId: number) => {
  console.log('Mock data generation is disabled in production');
  return null;
};

// Function to add mock data to history items (disabled)
const addMockAgentInfo = () => {
  console.log('Mock data addition is disabled in production');
};

import { getDeviceIcon } from '../../utils/deviceUtils';

// Override any global styling affecting the Windows icon
const overrideIconStyles = () => {
  // Add a style tag to override any global styles affecting the Windows icon
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .pi-microsoft, .pi-apple, .pi-server {
      color: inherit !important;
    }
  `;
  document.head.appendChild(styleTag);
};

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

/* Removed custom device-icon styling to match Devices view exactly */
</style>

