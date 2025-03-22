<template>
  <div class="of-history-view">
    <ModuleHeader title="History">
      <template #actions>
        <!-- No actions in header for this view -->
      </template>
    </ModuleHeader>

    <div class="of-history-content">
      <div class="of-filters-container">
        <div class="of-filters-row">
          <div class="of-search-container">
            <SearchBar v-model="filters.global.value" placeholder="Search history..." />
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
        :searchFields="['command', 'username', 'type', 'time', 'script_name']"
        emptyIcon="pi pi-history"
        emptyTitle="No History Items"
        emptyMessage="No history items are available."
        emptyHint="History items will appear here as commands and scripts are executed."
        :filters="filters"
        style="width: 100%"
      >
          <Column field="time" header="Time" sortable style="width: 15%">
            <template #body="{ data }">
              {{ formatTime(data.time) }}
            </template>
          </Column>
          <Column field="type" header="Type" sortable style="width: 10%">
            <template #body="{ data }">
              <Tag :value="formatType(data.type)" :severity="getTypeSeverity(data.type)" />
            </template>
          </Column>
          <Column field="command" header="Command/Script" sortable style="width: 40%">
            <template #body="{ data }">
              {{ data.script_name || data.command }}
            </template>
          </Column>
          <Column field="username" header="User" sortable style="width: 10%" />
          <Column v-if="selectedAgent === null" field="agent" header="Agent" sortable style="width: 15%">
            <template #body="{ data }">
              {{ getAgentHostname(data.agent) }}
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
import ModuleTable from "../../components/shared/ModuleTable.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import { 
  OFButton, 
  OFDialog,
  Dropdown,
  Tag,
  Column
} from "../../components/ui";
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
const devices = ref<Device[]>([]);
const selectedAgent = ref<string | null>(null);
const historyItems = ref<HistoryEntry[]>([]);
const previousHistoryItems = ref<HistoryEntry[]>([]);
const refreshInterval = ref<number | null>(null);
const showDialog = ref(false);
const selectedHistoryItem = ref<HistoryEntry | null>(null);

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  type: { value: null, matchMode: FilterMatchMode.EQUALS }
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
    
    // For local development, use mock data
    if (window.location.hostname === 'localhost' && window.location.port === '5177') {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          time: "2025-03-21T22:50:22.974500Z",
          type: "cmd_run",
          command: "echo \"dsaads\"",
          username: "tactical",
          results: "dsaads",
          script_results: null,
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          script: null,
          custom_field: null
        },
        {
          id: 2,
          time: "2025-03-21T22:54:01.921251Z",
          type: "script_run",
          command: "",
          username: "tactical",
          results: null,
          script_results: {
            id: 2,
            stderr: "usage: trmm4166938497 [-h] [--no-download] [--no-upload] [--single] [--bytes]\n                      [--share] [--simple] [--csv]\n                      [--csv-delimiter CSV_DELIMITER] [--csv-header] [--json]\n                      [--list] [--server SERVER] [--exclude EXCLUDE]\n                      [--mini MINI] [--source SOURCE] [--timeout TIMEOUT]\n                      [--secure] [--no-pre-allocate] [--version]\ntrmm4166938497: error: unrecognized arguments: dsadadas\n",
            stdout: "",
            retcode: 0,
            execution_time: 0.371898875
          },
          script_name: "Network - Speed Test",
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          script: 14,
          custom_field: null
        }
      ];
      
      // Check if data has changed before updating
      if (JSON.stringify(mockHistory) !== JSON.stringify(previousHistoryItems.value)) {
        historyItems.value = mockHistory;
        previousHistoryItems.value = JSON.parse(JSON.stringify(mockHistory));
      }
      
      loading.value = false;
      return;
    }
    
    // Choose the right endpoint based on whether we're showing a single agent or all agents
    const endpoint = selectedAgent.value
      ? `${API_URL}/agents/${selectedAgent.value}/history/`
      : `${API_URL}/agents/history/`; // Assumes an endpoint exists for all agents' history
    
    const response = await restClient.get<HistoryEntry[]>(endpoint);
    const newHistory = Array.isArray(response) ? response : [];
    
    // Only update the UI if data has changed
    if (JSON.stringify(newHistory) !== JSON.stringify(previousHistoryItems.value)) {
      historyItems.value = newHistory;
      previousHistoryItems.value = JSON.parse(JSON.stringify(newHistory));
    }
  } catch (error) {
    console.error('Failed to fetch history:', error);
    toastService.showError('Failed to fetch history');
  } finally {
    loading.value = false;
  }
};

// Set up one-second refresh interval
const setupRefreshInterval = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  refreshInterval.value = window.setInterval(() => {
    fetchHistory();
  }, 1000);
};

onMounted(() => {
  fetchDevices();
  fetchHistory();
  setupRefreshInterval();
});

// Clean up interval when component is unmounted
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
});
</script>

<style scoped>
.of-history-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.of-history-content {
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
  align-items: center;
  height: 42px;
  margin-bottom: 1rem;
}

.of-search-container {
  flex: 1;
  height: 100%;
}

.of-filter-item {
  width: auto;
  min-width: 180px;
}

.of-history-container {
  flex: 1;
}

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
</style>
