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

      <div class="of-history-container">
        <AgentHistory 
          :agentId="selectedAgent" 
          :allAgentsMode="selectedAgent === null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import SearchBar from '../../components/shared/SearchBar.vue';
import AgentHistory from '../../components/shared/AgentHistory.vue';
import { 
  OFButton, 
  Dropdown,
  Tag
} from "../../components/ui";

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

onMounted(() => {
  fetchDevices();
});
</script>

<style scoped>
.of-history-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.of-history-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

.of-filters-container {
  margin-bottom: 1rem;
}

.of-filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.of-search-container {
  flex: 1;
  min-width: 200px;
}

.of-filter-item {
  width: 200px;
}

.of-history-container {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1rem;
}
</style>
