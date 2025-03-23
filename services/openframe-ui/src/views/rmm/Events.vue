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
        <Column v-if="selectedAgent === null" field="agent" header="Agent" sortable style="width: 15%">
          <template #body="{ data }">
            <div class="flex">
              <i :class="getDeviceIcon(data.agent_info?.plat)" class="mr-2" :style="{
                color: data.agent_info?.plat === 'windows' ? '#0078d7' : 
                       data.agent_info?.plat === 'darwin' ? '#999' : 
                       data.agent_info?.plat === 'linux' ? '#f8991d' : '',
                fontSize: '1.2rem',
                marginTop: '2px'
              }"></i>
              <div class="flex flex-column">
                <div>{{ getAgentHostname(data.agent) }}</div>
                <div class="text-xs text-color-secondary">
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
import { ref, onMounted, computed, onUnmounted } from "vue";
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
  const device = devices.value.find(d => d.id === agentId.toString());
  return device ? device.hostname : `Agent ${agentId}`;
};

const showOutputDialog = (historyItem: HistoryEntry) => {
  selectedHistoryItem.value = historyItem;
  
  // If we don't have agent info, try to add it
  if (!historyItem.agent_info && window.location.hostname === 'localhost') {
    selectedHistoryItem.value = { 
      ...historyItem, 
      agent_info: getMockAgentInfo(historyItem.agent) 
    };
  }
  
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
    
    // For local development, use mock data
    if (window.location.hostname === 'localhost' && window.location.port === '5177') {
      devices.value = [{
        id: '1',
        agent_id: 'PYUpjOssiHmALDSRbpGopBCpWNfAQpzECMYbKAuP',
        hostname: 'test-device'
      }];
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
  try {
    loading.value = true;
    
    let newHistory: HistoryEntry[] = [];
    
    // Check for mock data in localStorage when in development mode
    if (window.location.hostname === 'localhost') {
      const storedHistory = localStorage.getItem('events-history');
      if (storedHistory) {
        try {
          console.log('Loading mock history from localStorage');
          newHistory = JSON.parse(storedHistory);
        } catch (e) {
          console.error('Failed to parse mock history from localStorage:', e);
        }
      }
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
    
    // Verify agent data availability
    console.log('Agent data verification:', newHistory.map(item => ({
      agent: item.agent,
      agent_info: item.agent_info,
      has_os: item.agent_info ? Boolean(item.agent_info.os || item.agent_info.operating_system) : false
    })));
    
    // Only update the UI if data has changed
    if (JSON.stringify(newHistory) !== JSON.stringify(previousHistoryItems.value)) {
      historyItems.value = newHistory;
      previousHistoryItems.value = JSON.parse(JSON.stringify(newHistory));
      console.log('Updated history items:', historyItems.value);
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
    fetchHistory();
  }, 3000); // Changed from 1000 to 3000 ms
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
});

// Add function to enhance history items with agent information
const enhanceHistoryWithAgentInfo = async (history: HistoryEntry[]) => {
  try {
    // If we already have devices loaded, use them
    if (devices.value.length > 0) {
      const agents = await fetchAgentDetails();
      
      // Map agent details to history items
      return history.map(item => {
        const deviceId = item.agent.toString();
        const device = devices.value.find(d => d.id === deviceId);
        
        if (device) {
          const agentInfo = agents.find(a => a.agent_id === device.agent_id);
          if (agentInfo) {
            return { ...item, agent_info: agentInfo };
          }
        }
        
        // If no agent info found, add mock data for local development
        if (window.location.hostname === 'localhost') {
          return { 
            ...item, 
            agent_info: getMockAgentInfo(item.agent) 
          };
        }
        
        return item;
      });
    }
    
    return history;
  } catch (error) {
    console.error('Failed to enhance history with agent info:', error);
    
    // For local development, add mock data
    if (window.location.hostname === 'localhost') {
      return history.map(item => ({ 
        ...item, 
        agent_info: getMockAgentInfo(item.agent) 
      }));
    }
    
    return history;
  }
};

// Function to fetch agent details
const fetchAgentDetails = async () => {
  try {
    const response = await restClient.get(`${API_URL}/agents/`);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to fetch agent details:', error);
    return [];
  }
};

// Function to generate mock agent data for local development
const getMockAgentInfo = (agentId: number) => {
  // Different mock data based on agent ID for variety
  const mockPlatforms = ['windows', 'linux', 'darwin']; // Ensure lowercase for icon mapping
  const mockOSVersions = [
    'Windows 10 Pro 21H2', 
    'Ubuntu 22.04 LTS', 
    'macOS 12.5 Monterey'
  ];
  const mockStatuses = ['online', 'offline'];
  
  // Use agent ID to deterministically pick mock data
  const index = agentId % 3;
  const statusIndex = agentId % 2;
  
  // Create mock data with consistent platform values
  const mockData = {
    platform: mockPlatforms[index].charAt(0).toUpperCase() + mockPlatforms[index].slice(1),
    plat: mockPlatforms[index].toLowerCase(), // Ensure lowercase for icon mapping
    os: mockOSVersions[index],
    operating_system: mockOSVersions[index],
    status: mockStatuses[statusIndex]
  };
  
  return mockData;
};

// Use the same getDeviceIcon function as in Devices.vue
const getDeviceIcon = (platform: string) => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform?.toLowerCase()] || 'pi pi-desktop';
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
</style>

