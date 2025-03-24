<template>
  <div class="of-scripts-view">
    <ModuleHeader title="Events">
      <template #subtitle>View system and device event history</template>
      <template #actions>
        <OFButton 
          v-if="isDevelopment"
          icon="pi pi-database" 
          :class="[
            'p-button-sm', 
            useMockData ? 'p-button-success' : 'p-button-text'
          ]"
          @click="toggleMockData" 
          v-tooltip.top="useMockData ? 'Disable Mock Data' : 'Enable Mock Data'"
          style="margin-right: 0.5rem;" />
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
        :loading="historyLoading"
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
        <Column field="agent" header="Agent" sortable style="width: 25%" :hideWhen="() => false">
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i :class="getDeviceIcon(data.agent_info?.plat || getAgentHostname(data.agent).plat)" class="mr-2"></i>
              <div class="flex flex-column">
                <div>{{ data.agent_info?.hostname || getAgentHostname(data.agent).hostname }}</div>
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
import { MD5 } from 'crypto-js';

interface Device {
  id: string;
  agent_id: string;
  hostname: string;
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/tactical-rmm`;
const toastService = ToastService.getInstance();

// Development environment detection - moved to top of script
const isDevelopment = ref(window.location.hostname === 'localhost' && import.meta.env.MODE === 'development');

const historyLoading = ref(true);
const devicesLoading = ref(true);
const error = ref<Error | null>(null);
const devices = ref<Device[]>([]);
const selectedAgent = ref<string | null>(null);
const historyItems = ref<HistoryEntry[]>([]);
const previousHistoryItems = ref<HistoryEntry[]>([]);
const refreshInterval = ref<number | null>(null);
const showDialog = ref(false);
const selectedHistoryItem = ref<HistoryEntry | null>(null);
const autoPollingEnabled = ref(true); // Default to enabled
const useMockData = ref(false); // For mock data toggle
const lastHistoryHash = ref(''); // For MD5 hash tracking
const agentDetailsMap = ref(new Map()); // For storing agent details

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

// Add watchers for filter changes to trigger history fetch
// Individual watchers removed in favor of a single combined watcher at the end of the script

// We'll set up the immediate watcher after all functions are defined

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

const getAgentHostname = (agentData: any) => {
  if (!agentData) return { hostname: '', plat: '' };
  
  // If agentData is a number (agentId), try to find agent info in the cache
  if (typeof agentData === 'number') {
    if (agentDetailsMap.value.has(agentData)) {
      const agentInfo = agentDetailsMap.value.get(agentData);
      return {
        hostname: agentInfo.hostname || `Agent ${agentData}`,
        plat: agentInfo.plat || ''
      };
    }
    
    // Then try to find the device in the devices list
    const device = devices.value.find(d => d.id === agentData.toString());
    if (device) {
      return {
        hostname: device.hostname,
        plat: device.plat || ''
      };
    }
    
    // Fall back to default
    return { hostname: `Agent ${agentData}`, plat: '' };
  }
  
  // If agentData is an object with agent_info
  if (agentData.agent_info) {
    const agentInfo = agentData.agent_info;
    return {
      hostname: agentInfo.hostname || '',
      plat: agentInfo.plat || ''
    };
  }
  
  return { hostname: '', plat: '' };
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
    devicesLoading.value = true;
    
    // No mock data in production
    if (isDevelopment.value && false) {
      // Mock data is now disabled by default
      console.log('Development environment detected, but mock data is disabled');
      devicesLoading.value = false;
      return;
    }
    
    const response = await restClient.get<Device[]>(`${API_URL}/agents/`);
    devices.value = Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    toastService.showError('Failed to fetch devices');
  } finally {
    devicesLoading.value = false;
  }
};

const fetchHistory = async () => {
  try {
    historyLoading.value = true;
    
    let newHistory: HistoryEntry[] = [];
    let endpoint = '';
    
    // Construct the URL with filters
    const filterParams = [];
    if (selectedAgent.value !== null) {
      filterParams.push(`agent=${selectedAgent.value}`);
    }

    if (filters.value.type.value !== null) {
      filterParams.push(`type=${filters.value.type.value}`);
    }

    if (filters.value.global.value.trim()) {
      filterParams.push(`search=${encodeURIComponent(filters.value.global.value.trim())}`);
    }

    const queryString = filterParams.length ? `?${filterParams.join('&')}` : '';
    
    // Only use mock data in development mode for local testing
    if (isDevelopment.value && useMockData.value) {
      console.log('Development environment detected, using mock data');
      // If mock data is enabled, generate it
      newHistory = generateMockHistoryData();
    } else {
      console.log('Using real data from API');
      // Otherwise use real data
      
      // Choose the right endpoint based on whether we're showing a single agent or all agents
      endpoint = selectedAgent.value
        ? `${API_URL}/agents/${selectedAgent.value}/history/${queryString}`
        : `${API_URL}/agents/history/${queryString}`;
      
      const response = await restClient.get<HistoryEntry[]>(endpoint);
      newHistory = Array.isArray(response) ? response : [];
    }
    
    // Calculate MD5 hash of the history data
    const historyDataString = JSON.stringify(newHistory);
    const currentHash = MD5(historyDataString).toString();
    
    // Only process if the hash is different from the last request
    if (currentHash !== lastHistoryHash.value) {
      console.log('History data changed, updating...');
      lastHistoryHash.value = currentHash;
      
      // Sort history items by time in descending order (most recent first)
      newHistory.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      // Enhance history with agent information
      newHistory = await enhanceHistoryWithAgentInfo(newHistory);
      
      // Verify agent data availability (only log in development)
      if (isDevelopment.value) {
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
      
      // Use nextTick to ensure UI updates don't block rendering
      nextTick(() => {
        historyItems.value = newHistory;
        previousHistoryItems.value = JSON.parse(JSON.stringify(newHistory));
        
        if (isDevelopment.value) {
          console.log('Updated history items:', historyItems.value);
        }
      });
    } else {
      console.log('History data unchanged, skipping update');
    }
  } catch (error) {
    console.error('Failed to fetch history:', error);
    toastService.showError('Failed to fetch history');
  } finally {
    historyLoading.value = false;
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

onMounted(async () => {
  try {
    // First fetch history immediately on mount
    await fetchHistory();
    
    // Then fetch devices after history returns
    await fetchDevices();
  } catch (error) {
    console.error('Error during initial data fetch:', error);
  }
  
  if (autoPollingEnabled.value) {
    setupRefreshInterval();
  }
  
  // Override icon styles
  overrideIconStyles();
  
  // Only add mock data when explicitly requested for testing
  // Mock data is now disabled by default
});

// We'll move the immediate watcher to the end of the script after all functions are defined

// Watch for changes in selected agent and fetch history when it changes
watch(selectedAgent, () => {
  console.log('Selected agent changed, fetching history');
  fetchHistory();
});

// Watch for changes in filters
watch(filters, () => {
  console.log('Filters changed, fetching history');
  fetchHistory();
}, { deep: true });

// Add function to enhance history items with agent information
const enhanceHistoryWithAgentInfo = async (history: HistoryEntry[]) => {
  try {
    // Step 1: Process the history entries to get agent IDs
    const uniqueAgentIds = Array.from(new Set(history.map(item => item.agent)));
    console.log('Unique agent IDs from history:', uniqueAgentIds);
    
    // Check if we need to fetch new agent details
    // Only fetch if agentDetailsMap is empty or we have new agent IDs not in the map
    if (agentDetailsMap.value.size === 0 || uniqueAgentIds.some(id => !agentDetailsMap.value.has(id))) {
      console.log('Need to fetch agent details');
      
      // Step 2: Fetch the list of all agents
      let agentList = [];
      
      if (isDevelopment.value && useMockData.value) {
        // Use mock data
        agentList = getMockAgentsList();
      } else {
        // Fetch from API
        const agentResponse = await restClient.get(`${API_URL}/agents/`);
        agentList = Array.isArray(agentResponse) ? agentResponse : [];
      }
      console.log('Fetched agents:', agentList.length);
      
      // Step 3: Process each agent to get their numeric ID
      for (const agent of agentList) {
        try {
          // Skip if we already have this agent's details
          const existingAgent = Array.from(agentDetailsMap.value.values())
            .find(a => a.agent_id === agent.agent_id);
          
          if (existingAgent) {
            console.log(`Agent ${agent.agent_id} already in cache`);
            continue;
          }
          
          // Get detailed agent info which should include the numeric ID
          let agentDetails;
          
          if (isDevelopment.value && useMockData.value) {
            // Use mock data
            agentDetails = getMockAgentDetails(agent.agent_id);
          } else {
            // Fetch from API
            agentDetails = await restClient.get(`${API_URL}/agents/${agent.agent_id}/`);
          }
          
          if (!agentDetails) {
            console.warn(`No details found for agent ${agent.agent_id}`);
            continue;
          }
          
          // Extract the numeric ID from the agent details
          let numericId;
          
          // Look in different places based on what's available in the response
          if (agentDetails.winupdatepolicy && agentDetails.winupdatepolicy.length > 0) {
            numericId = agentDetails.winupdatepolicy[0].agent;
          } else if (agentDetails.effective_patch_policy) {
            numericId = agentDetails.effective_patch_policy.agent;
          } else if (agentDetails.id) {
            numericId = agentDetails.id;
          }
          
          if (numericId !== undefined) {
            // Store agent with all its details keyed by numeric ID
            agentDetailsMap.value.set(numericId, {
              ...agent,
              ...agentDetails,
              numericId
            });
            console.log(`Added agent ${agent.hostname} with numeric ID ${numericId} to cache`);
          } else {
            console.warn(`Could not determine numeric ID for agent ${agent.agent_id}`);
          }
        } catch (error) {
          console.error(`Failed to fetch details for agent ${agent.agent_id}:`, error);
        }
      }
    } else {
      console.log('Using cached agent details');
    }
    
    // Step 4: Map agent details to history items using the numeric ID
    return history.map(item => {
      const numericAgentId = item.agent;
      
      // Look for a direct match in our agent map
      if (agentDetailsMap.value.has(numericAgentId)) {
        return { ...item, agent_info: agentDetailsMap.value.get(numericAgentId) };
      }
      
      // If no direct match found, log warning and return original item
      console.warn(`No agent found with numeric ID ${numericAgentId}`);
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
    // Get the list of all agents
    const response = await restClient.get(`${API_URL}/agents/`);
    const agentList = Array.isArray(response) ? response : [];
    
    // For each agent, fetch detailed information that includes the numeric ID
    const agentsWithDetails = await Promise.all(
      agentList.map(async (agent) => {
        try {
          // Get detailed agent info which should include the numeric ID
          const detailResponse = await restClient.get(`${API_URL}/agents/${agent.agent_id}/`);
          return { ...agent, ...detailResponse };
        } catch (detailError) {
          console.error(`Failed to fetch details for agent ${agent.agent_id}:`, detailError);
          return agent;
        }
      })
    );
    
    console.log(`Fetched ${agentsWithDetails.length} agents with details from API`);
    return agentsWithDetails;
  } catch (error) {
    console.error('Failed to fetch agent details:', error);
    return [];
  }
};

// Mock data functions are disabled in production by default

// Function to toggle mock data for testing (only in development)
const toggleMockData = () => {
  if (isDevelopment.value) {
    useMockData.value = !useMockData.value;
    console.log(`Mock data ${useMockData.value ? 'enabled' : 'disabled'}`);
    fetchHistory();
  } else {
    console.warn('Mock data toggle is only available in development mode');
  }
};

// Using the existing getMockHistoryData function defined elsewhere in the file

// Function to generate mock agent data for local development
const getMockAgentInfo = (agentId: number) => {
  if (!isDevelopment.value) {
    console.log('Mock data generation is disabled in production');
    return null;
  }
  
  // Check if we have this agent in our detailed map
  if (agentDetailsMap.value.has(agentId)) {
    return agentDetailsMap.value.get(agentId);
  }
  
  // If agent is 1, return MacBook Pro details
  if (agentId === 1) {
    return {
      agent_id: "PYUpjOssiHmALDSRbpGopBCpWNfAQpzECMYbKAuP",
      hostname: "Michaels-MacBook-Pro.local",
      plat: "darwin",
      os: "Darwin 15.4 arm64 24.4.0",
      operating_system: "Darwin 15.4 arm64 24.4.0",
      id: 1 // This is the numeric ID that should match history entries
    };
  }
  
  // If agent is 47, return Windows Desktop details
  if (agentId === 47) {
    return {
      agent_id: "TrgEKxblzTZRVjctXPrSlUQEYNubolAMVnIbTdkD",
      hostname: "DESKTOP-057QV01",
      plat: "windows",
      os: "Windows 11 Pro, 64 bit v24H2 (build 26100.3476)",
      operating_system: "Windows 11 Pro, 64 bit v24H2 (build 26100.3476)",
      id: 47 // This is the numeric ID that should match history entries
    };
  }
  
  // Default fallback
  return {
    agent_id: `MOCK_AGENT_${agentId}`,
    hostname: `mock-host-${agentId}`,
    plat: ['windows', 'linux', 'darwin'][agentId % 3],
    os: ['Windows 10', 'Ubuntu 20.04', 'macOS 12.0'][agentId % 3],
    operating_system: ['Windows 10', 'Ubuntu 20.04', 'macOS 12.0'][agentId % 3],
    id: agentId // This is the numeric ID that should match history entries
  };
};

// Function to get mock agents list
const getMockAgentsList = () => {
  return [
    {"agent_id":"PYUpjOssiHmALDSRbpGopBCpWNfAQpzECMYbKAuP","alert_template":null,"hostname":"Michaels-MacBook-Pro.local","site_name":"Default Site","client_name":"Default Organization","monitoring_type":"workstation","description":"","needs_reboot":false,"pending_actions_count":0,"status":"online","overdue_text_alert":false,"overdue_email_alert":false,"overdue_dashboard_alert":false,"last_seen":"2025-03-24T18:26:10.456099Z","boot_time":1742827053.0,"checks":{"total":0,"passing":0,"failing":0,"warning":0,"info":0,"has_failing_checks":false},"maintenance_mode":false,"logged_username":"","italic":false,"block_policy_inheritance":false,"plat":"darwin","goarch":"arm64","has_patches_pending":false,"version":"2.9.0","operating_system":"Darwin 15.4 arm64 24.4.0","public_ip":"104.12.42.193","cpu_model":["Apple M3 Max"],"graphics":"No graphics cards","local_ips":"fe80::1/64, fe80::c6f:2e6d:1794:fd4a/64, 172.16.3.240/22, fe80::a01a:d4ff:fe98:4013/64, fe80::a01a:d4ff:fe98:4013/64, fe80::37c8:79ad:fa40:29ac/64, fe80::e523:bd47:8789:4139/64, fe80::3fb2:3d16:b72e:aa52/64, fe80::ce81:b1c:bd2c:69e/64, fe80::cf9b:b626:f96d:d58b/64, fe80::2e62:9b4c:34e0:504d/64, 172.16.216.1/24, fe80::603e:5fff:fe56:5364/64, 172.16.181.1/24, fe80::603e:5fff:fe56:5365/64","make_model":"Mac15,11\n","physical_disks":["Apple APPLE SSD AP1024Z SCSI SSD disk0 931.8 GB","Apple APPLE SSD AP1024Z SCSI SSD disk1 500.0 MB","Apple APPLE SSD AP1024Z SCSI SSD disk2 5.0 GB","Apple APPLE SSD AP1024Z SCSI SSD disk3 926.4 GB"],"custom_fields":[],"serial_number":"JNFJXHD732"},
    {"agent_id":"TrgEKxblzTZRVjctXPrSlUQEYNubolAMVnIbTdkD","alert_template":null,"hostname":"DESKTOP-057QV01","site_name":"Default Site","client_name":"Default Organization","monitoring_type":"server","description":"","needs_reboot":false,"pending_actions_count":0,"status":"online","overdue_text_alert":false,"overdue_email_alert":false,"overdue_dashboard_alert":false,"last_seen":"2025-03-24T18:26:22.647848Z","boot_time":1742851155.0,"checks":{"total":0,"passing":0,"failing":0,"warning":0,"info":0,"has_failing_checks":false},"maintenance_mode":false,"logged_username":"Michael Assraf","italic":false,"block_policy_inheritance":false,"plat":"windows","goarch":"amd64","has_patches_pending":false,"version":"2.9.0","operating_system":"Windows 11 Pro, 64 bit v24H2 (build 26100.3476)","public_ip":"104.12.42.193","cpu_model":["Apple silicon, 4C/4T"],"graphics":"VMware SVGA 3D","local_ips":"172.16.1.206","make_model":"VMware, Inc. VMware20,1","physical_disks":["VMware Virtual NVMe Disk 64GB SCSI"],"custom_fields":[],"serial_number":"8C1C621E16C94D56"}
  ];
};

// Function to get mock agent details
const getMockAgentDetails = (agentId) => {
  if (agentId === 'PYUpjOssiHmALDSRbpGopBCpWNfAQpzECMYbKAuP') {
    return {
      "winupdatepolicy":[{"id":1,"created_by":null,"created_time":"2025-03-21T21:38:39.562139Z","modified_by":null,"modified_time":"2025-03-21T21:38:39.562146Z","critical":"inherit","important":"inherit","moderate":"inherit","low":"inherit","other":"inherit","run_time_hour":3,"run_time_frequency":"inherit","run_time_days":[5,6],"run_time_day":1,"reboot_after_install":"inherit","reprocess_failed_inherit":true,"reprocess_failed":false,"reprocess_failed_times":5,"email_if_fail":false,"agent":1,"policy":null}],
      "status":"online",
      "hostname":"Michaels-MacBook-Pro.local",
      "plat":"darwin",
      "operating_system":"Darwin 15.4 arm64 24.4.0"
    };
  } else if (agentId === 'TrgEKxblzTZRVjctXPrSlUQEYNubolAMVnIbTdkD') {
    return {
      "winupdatepolicy":[{"id":47,"created_by":null,"created_time":"2025-03-24T17:43:11.838479Z","modified_by":null,"modified_time":"2025-03-24T17:43:11.838486Z","critical":"inherit","important":"inherit","moderate":"inherit","low":"inherit","other":"inherit","run_time_hour":3,"run_time_frequency":"inherit","run_time_days":[],"run_time_day":1,"reboot_after_install":"inherit","reprocess_failed_inherit":true,"reprocess_failed":false,"reprocess_failed_times":5,"email_if_fail":false,"agent":47,"policy":null}],
      "status":"online",
      "hostname":"DESKTOP-057QV01",
      "plat":"windows",
      "operating_system":"Windows 11 Pro, 64 bit v24H2 (build 26100.3476)"
    };
  }
  return null;
};

// Function to add mock data to history items
const addMockAgentInfo = () => {
  if (!isDevelopment.value) {
    console.log('Mock data addition is disabled in production');
    return;
  }
  
  historyItems.value.forEach(item => {
    if (!item.agent_info) {
      item.agent_info = getMockAgentInfo(item.agent);
    }
  });
};

// Function to generate mock history data for local development
// Renamed to avoid duplicate declaration
const generateMockHistoryData = () => {
  if (!isDevelopment.value) {
    console.log('Mock data generation is disabled in production');
    return [];
  }
  
  // Return mock history data from requests.json
  return [
    {"id":1,"time":"2025-03-21T22:50:22.974500Z","type":"cmd_run","command":"echo \"dsaads\"","username":"tactical","results":"dsaads","script_results":null,"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":null,"custom_field":null},
    {"id":2,"script_name":"Network - Speed Test","time":"2025-03-21T22:54:01.921251Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":2,"stderr":"usage: trmm4166938497 [-h] [--no-download] [--no-upload] [--single] [--bytes]\n                      [--share] [--simple] [--csv]\n                      [--csv-delimiter CSV_DELIMITER] [--csv-header] [--json]\n                      [--list] [--server SERVER] [--exclude EXCLUDE]\n                      [--mini MINI] [--source SOURCE] [--timeout TIMEOUT]\n                      [--secure] [--no-pre-allocate] [--version]\ntrmm4166938497: error: unrecognized arguments: dsadadas\n","stdout":"","retcode":0,"execution_time":0.371898875},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":14,"custom_field":null},
    {"id":3,"script_name":"Network - Online check","time":"2025-03-21T22:55:49.449106Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":3,"stderr":"","stdout":"PING_HOSTNAME was not provided. Using 'localhost'\nPING_TIMEOUT was not provided. Using '5'\nSuccess!\nPING localhost (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.056 ms\n\n--- localhost ping statistics ---\n1 packets transmitted, 1 packets received, 0.0% packet loss\nround-trip min/avg/max/stddev = 0.056/0.056/0.056/0.000 ms\n\n","retcode":1,"execution_time":0.231158},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":128,"custom_field":null},
    {"id":4,"script_name":"Python - Module Manager","time":"2025-03-22T00:33:44.629712Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":4,"stderr":"usage: trmm2147041621 [-h] [--log-level {debug,info,warning,error,critical}]\n                      {help,info,list,check,install,uninstall,upgrade} ...\ntrmm2147041621: error: argument command: invalid choice: 'cdsadsa' (choose from 'help', 'info', 'list', 'check', 'install', 'uninstall', 'upgrade')\n","stdout":"","retcode":2,"execution_time":0.256980292},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":129,"custom_field":null},
    {"id":5,"script_name":"Network - Speed Test","time":"2025-03-22T16:37:26.364095Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":5,"stderr":"","stdout":"Retrieving speedtest.net configuration...\nTesting from AT&T Internet (108.236.223.17)...\nRetrieving speedtest.net server list...\nSelecting best server based on ping...\nHosted by Opticaltel (Miami, FL) [9.34 km]: 14.729 ms\nTesting download speed................................................................................\nDownload: 389.90 Mbit/s\nTesting upload speed......................................................................................................\nUpload: 459.59 Mbit/s\n","retcode":0,"execution_time":12.595990208},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":14,"custom_field":null},
    {"id":6,"script_name":"RustDesk - Get RustDeskID for client","time":"2025-03-22T17:20:56.689640Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":6,"stderr":"fork/exec /opt/tacticalagent/trmm3373517501: exec format error\n","stdout":"","retcode":-1,"execution_time":0.002781417},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":37,"custom_field":null},
    {"id":7,"script_name":"CPU Usage Check","time":"2025-03-22T17:38:03.830312Z","type":"script_run","command":"","username":"tactical","results":null,"script_results":{"id":7,"stderr":"/opt/tacticalagent/trmm3100519132: line 21: vmstat: command not found\n/opt/tacticalagent/trmm3100519132: line 21: 100-: syntax error: operand expected (error token is \"-\")\n/opt/tacticalagent/trmm3100519132: line 23: [: -le: unary operator expected\n","stdout":"CPU usage greater than 80%. (%)\n","retcode":1,"execution_time":0.321736167},"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":124,"custom_field":null},
    {"id":8,"time":"2025-03-22T22:17:22.196463Z","type":"cmd_run","command":"echo \"dsadsa\"","username":"tactical","results":"dsadsa","script_results":null,"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":null,"custom_field":null},
    {"id":9,"time":"2025-03-23T02:03:17.274807Z","type":"cmd_run","command":"echo \"Dsadas\"","username":"tactical","results":"Dsadas","script_results":null,"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":null,"custom_field":null},
    {"id":10,"time":"2025-03-23T03:22:10.969620Z","type":"cmd_run","command":"echo \"dsadsa\"","username":"tactical","results":"dsadsa","script_results":null,"collector_all_output":false,"save_to_agent_note":false,"agent":1,"script":null,"custom_field":null}
  ];
};




// Function to toggle mock data for testing (only in development)
// Moved to line ~528

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

// Set up watcher at the very end of the script after all functions are defined
// Removed immediate: true to prevent duplicate calls on mount
watch([selectedAgent, () => filters.value.type.value, () => filters.value.global.value], 
  () => {
    fetchHistory();
  }
);
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

