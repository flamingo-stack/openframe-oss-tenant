<template>
  <div class="of-scripts-view">
    <ModuleHeader title="Events">
      <template #actions>
        <OFButton icon="pi pi-sync" class="p-button-text p-button-sm" @click="togglePolling(!autoPollingEnabled)" 
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
        :filters="filters"
        :rows="10"
        :paginator="true"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        :globalFilterFields="['script_name', 'command', 'agent', 'status', 'time']"
        dataKey="id"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        :rowHover="true"
        :scrollable="true"
        scrollHeight="flex"
      >
        <Column field="time" header="Time" sortable style="width: 15%">
          <template #body="{ data }">
            {{ formatDate(data.time) }}
          </template>
        </Column>
        <Column field="script_name" header="Command" sortable style="width: 20%">
          <template #body="{ data }">
            {{ data.script_name || data.command }}
          </template>
        </Column>
        <Column v-if="selectedAgent === null" field="agent" header="Agent" sortable style="width: 15%">
          <template #body="{ data }">
            {{ data.agent }}
          </template>
        </Column>
        <Column field="status" header="Status" sortable style="width: 10%">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>
        <Column field="stdout" header="Output" style="width: 30%">
          <template #body="{ data }">
            <div class="command-output">{{ data.stdout }}</div>
          </template>
        </Column>
        <Column header="Actions" style="width: 10%">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <OFButton 
                icon="pi pi-eye" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'View Details'" 
                @click="viewDetails(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import ModuleTable from "../../components/shared/ModuleTable.vue";
import SearchBar from "../../components/shared/SearchBar.vue";
import Column from "primevue/column";
import { useToast } from "primevue/usetoast";
import { Dropdown, Tag, OFButton } from "../../components/ui";

const toast = useToast();

// Data
const historyItems = ref([]);
const loading = ref(false);
const autoPollingEnabled = ref(true);
const pollingInterval = ref(null);
const selectedAgent = ref(null);

// Filters
const filters = ref({
  global: { value: null, matchMode: "contains" },
  type: { value: null, matchMode: "equals" },
});

// Options for dropdowns
const typeOptions = [
  { label: "All Types", value: null },
  { label: "Script", value: "script" },
  { label: "Command", value: "cmd" },
];

const agentOptions = ref([
  { label: "All Agents", value: null }
]);

// Methods
const viewDetails = (event) => {
  // Placeholder for view details
  console.log("View details for:", event);
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getStatusSeverity = (status) => {
  if (!status) return "info";
  
  status = status.toLowerCase();
  if (status === "success" || status === "completed") return "success";
  if (status === "pending" || status === "running") return "info";
  if (status === "failed" || status === "error") return "danger";
  return "warning";
};

const togglePolling = (enabled) => {
  autoPollingEnabled.value = enabled;
};

// Lifecycle hooks
onMounted(() => {
  // Mock data for display
  historyItems.value = [
    {
      id: 1,
      time: new Date().toISOString(),
      script_name: "System Check",
      command: "system_check.sh",
      agent: "server-01",
      status: "success",
      stdout: "All systems operational"
    },
    {
      id: 2,
      time: new Date().toISOString(),
      script_name: null,
      command: "df -h",
      agent: "server-02",
      status: "completed",
      stdout: "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1       30G   15G   15G  50% /"
    }
  ];
});

onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>

<style scoped>
.of-scripts-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.of-scripts-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.command-output {
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


</style>
