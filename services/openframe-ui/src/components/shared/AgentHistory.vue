<template>
  <div class="agent-history-container">
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading history...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--red-500);"></i>
      <p>{{ error }}</p>
      <OFButton label="Retry" icon="pi pi-refresh" @click="fetchHistory" />
    </div>
    
    <div v-else>
      <DataTable 
        :value="historyItems" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        stripedRows
        showGridlines
        class="p-datatable-sm"
        :emptyMessage="'No history records found'"
      >
        <Column v-if="props.allAgentsMode" field="agent_hostname" header="Agent" :sortable="true">
          <template #body="slotProps">
            {{ slotProps.data.agent_hostname || `Agent ${slotProps.data.agent}` }}
          </template>
        </Column>
        
        <Column field="time" header="Time" :sortable="true">
          <template #body="slotProps">
            {{ formatTimestamp(slotProps.data.time) }}
          </template>
        </Column>
        
        <Column field="type" header="Type" :sortable="true">
          <template #body="slotProps">
            <Tag 
              :value="slotProps.data.type === 'cmd_run' ? 'Command' : 'Script'" 
              :severity="slotProps.data.type === 'cmd_run' ? 'warning' : 'info'"
            />
          </template>
        </Column>
        
        <Column field="username" header="User" :sortable="true" />
        
        <Column field="command" header="Command/Script">
          <template #body="slotProps">
            <div v-if="slotProps.data.type === 'cmd_run'">
              <code>{{ slotProps.data.command }}</code>
            </div>
            <div v-else>
              <span>{{ slotProps.data.script_name || 'Unknown Script' }}</span>
            </div>
          </template>
        </Column>
        
        <Column header="Results" style="min-width: 250px">
          <template #body="slotProps">
            <div v-if="slotProps.data.type === 'cmd_run'">
              <OFButton 
                v-if="slotProps.data.results" 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                @click="showResultsDialog(slotProps.data.results)"
                label="View Output"
              />
              <span v-else class="text-color-secondary">No output</span>
            </div>
            <div v-else-if="slotProps.data.script_results">
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                @click="showScriptResultsDialog(slotProps.data.script_results)"
                label="View Output"
              />
            </div>
            <span v-else class="text-color-secondary">No output</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
  
  <!-- Results Dialog -->
  <Dialog 
    v-model:visible="resultsDialogVisible" 
    header="Command Output" 
    :modal="true" 
    :style="{ width: '60vw' }"
    class="p-dialog-custom"
  >
    <div class="code-block">
      <pre>{{ selectedResults }}</pre>
    </div>
  </Dialog>
  
  <!-- Script Results Dialog -->
  <Dialog 
    v-model:visible="scriptResultsDialogVisible" 
    header="Script Execution Results" 
    :modal="true" 
    :style="{ width: '60vw' }"
    class="p-dialog-custom"
  >
    <div v-if="selectedScriptResults" class="script-results">
      <div class="of-form-group">
        <label>Exit Code</label>
        <Tag 
          :value="selectedScriptResults.retcode" 
          :severity="selectedScriptResults.retcode === 0 ? 'success' : 'danger'"
        />
      </div>
      
      <div class="of-form-group">
        <label>Execution Time</label>
        <p>{{ selectedScriptResults.execution_time.toFixed(2) }} seconds</p>
      </div>
      
      <div class="of-form-group" v-if="selectedScriptResults.stdout">
        <label>Standard Output</label>
        <div class="code-block">
          <pre>{{ selectedScriptResults.stdout }}</pre>
        </div>
      </div>
      
      <div class="of-form-group" v-if="selectedScriptResults.stderr">
        <label>Standard Error</label>
        <div class="code-block error">
          <pre>{{ selectedScriptResults.stderr }}</pre>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps, watch } from 'vue';
import { HistoryEntry, ScriptResult } from '../../types/rmm';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import { OFButton } from '../../components/ui';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';

const props = defineProps<{
  agentId: string | null;
  allAgentsMode?: boolean;
}>();

const historyItems = ref<HistoryEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const configService = ConfigService.getInstance();
const toastService = ToastService.getInstance();

// Results dialog
const resultsDialogVisible = ref(false);
const selectedResults = ref('');
const scriptResultsDialogVisible = ref(false);
const selectedScriptResults = ref<ScriptResult | null>(null);

const fetchHistory = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Use mock data for testing in local development
    if (window.location.hostname === 'localhost' && window.location.port === '5177') {
      // Mock history data for testing
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
          agent_hostname: "test-device",
          script: null,
          custom_field: null
        },
        {
          id: 2,
          script_name: "Network - Speed Test",
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
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          agent_hostname: "test-device",
          script: 14,
          custom_field: null
        },
        {
          id: 3,
          script_name: "Network - Online check",
          time: "2025-03-21T22:55:49.449106Z",
          type: "script_run",
          command: "",
          username: "tactical",
          results: null,
          script_results: {
            id: 3,
            stderr: "",
            stdout: "PING_HOSTNAME was not provided. Using 'localhost'\nPING_TIMEOUT was not provided. Using '5'\nSuccess!\nPING localhost (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.056 ms\n\n--- localhost ping statistics ---\n1 packets transmitted, 1 packets received, 0.0% packet loss\nround-trip min/avg/max/stddev = 0.056/0.056/0.056/0.000 ms\n\n",
            retcode: 1,
            execution_time: 0.231158
          },
          collector_all_output: false,
          save_to_agent_note: false,
          agent: 1,
          agent_hostname: "test-device",
          script: 128,
          custom_field: null
        }
      ];
      
      historyItems.value = mockHistory;
      loading.value = false;
      return;
    }
    
    // Determine endpoint based on whether we have an agent ID
    const endpoint = props.agentId 
      ? `${configService.getConfig().gatewayUrl}/tools/tactical-rmm/agents/${props.agentId}/history/`
      : `${configService.getConfig().gatewayUrl}/tools/tactical-rmm/agents/history/`;
    
    const response = await restClient.get<HistoryEntry[]>(endpoint);
    historyItems.value = response;
  } catch (err: any) {
    error.value = err.message || 'Failed to load history';
    toastService.showError(error.value);
  } finally {
    loading.value = false;
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const showResultsDialog = (results: string) => {
  selectedResults.value = results;
  resultsDialogVisible.value = true;
};

const showScriptResultsDialog = (results: ScriptResult) => {
  selectedScriptResults.value = results;
  scriptResultsDialogVisible.value = true;
};

watch(() => props.agentId, () => {
  fetchHistory();
});

onMounted(() => {
  fetchHistory();
});
</script>

<style scoped>
.agent-history-container {
  padding: 1rem 0;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.loading-state i,
.error-state i {
  margin-bottom: 1rem;
  color: var(--text-color-secondary);
}

.loading-state p,
.error-state p {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  transition: all 0.2s;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--font-family-monospace, monospace);
  font-size: 0.875rem;
  color: var(--text-color);
}

.code-block.error {
  border-color: var(--red-100);
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

.of-form-group p {
  margin: 0;
}

.script-results {
  padding: 0.5rem;
}
</style>
