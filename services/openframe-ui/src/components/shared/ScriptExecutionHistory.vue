<template>
  <div class="of-script-history">
    <div 
      v-if="visible" 
      class="of-sidebar-mask active" 
      @click="onVisibilityChange(false)"
    ></div>
    <div 
      class="of-sidebar" 
      :class="{ 'active': visible }"
    >
      <div class="of-sidebar-header">
        <h3 class="of-text-xl m-0">Script Execution History</h3>
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

      <div class="of-sidebar-content">
        <div v-for="execution in executions" :key="execution.id" class="of-execution-item">
          <div class="flex align-items-center justify-content-between mb-3">
            <div class="flex align-items-center gap-2">
              <i :class="getStatusIcon(execution.status)" :style="{ color: getStatusColor(execution.status) }" />
              <span class="font-medium">{{ execution.deviceName }}</span>
            </div>
            <span class="of-text-sm text-color-secondary">{{ formatTimestamp(execution.timestamp) }}</span>
          </div>
          
          <div class="of-form-group mb-3">
            <label>Command</label>
            <OFCodeBlock>
              <code>{{ execution.command }}</code>
            </OFCodeBlock>
          </div>
          
          <div class="of-form-group">
            <label>Output</label>
            <OFCodeBlock :error="execution.status === 'error'">
              <pre>{{ execution.output || 'No output' }}</pre>
            </OFCodeBlock>
          </div>
        </div>

        <OFEmptyState
          v-if="executions.length === 0"
          icon="pi pi-terminal"
          title="No script executions yet"
          message="Run a command to see its execution history here."
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Sidebar from 'primevue/sidebar';
import { OFButton, OFCodeBlock, OFEmptyState } from '../../components/ui';

interface ScriptExecution {
  id: string;
  deviceName: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'pending';
  timestamp: number;
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

const onVisibilityChange = (value: boolean) => {
  emit('update:visible', value);
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

// Load history on mount
onMounted(() => {
  loadHistory();
});

// Expose methods for parent component
defineExpose({
  addExecution,
  updateExecution,
  clearHistory
});
</script>

<style>
.of-script-history {
  .of-sidebar-mask {
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

  .of-sidebar {
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

  .of-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .of-sidebar-content {
    height: calc(100% - 72px);
    overflow-y: auto;
    padding: 1.5rem;
  }
}

.of-execution-item {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

/* Empty state is now replaced by OFEmptyState component */

.of-form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }
}

/* Code block is now replaced by OFCodeBlock component */
</style>    