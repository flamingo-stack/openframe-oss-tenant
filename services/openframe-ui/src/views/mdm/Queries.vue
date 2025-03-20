<template>
  <div class="mdm-queries">
    <ModuleHeader title="Queries">
      <template #actions>
        <OFButton 
          label="Create Query" 
          icon="pi pi-plus" 
          @click="showCreateDialog = true"
          class="p-button-primary" 
        />
      </template>
    </ModuleHeader>

    <div class="queries-content">
      <SearchBar
        v-model="filters['global'].value"
        placeholder="Search queries..."
      />

      <ModuleTable
        :items="queries"
        :loading="loading"
        :searchFields="['name', 'description', 'platform']"
        emptyIcon="pi pi-database"
        emptyTitle="No Queries Found"
        emptyMessage="There are no live queries configured yet."
        emptyHint="Add queries to gather real-time information from your devices."
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i class="pi pi-database mr-2"></i>
              <div class="query-info">
                <span class="query-name">{{ data.name }}</span>
                <span class="query-description text-sm text-color-secondary">{{ data.description }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable style="width: 150px">
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" 
                 :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="status" header="Status" sortable style="width: 200px">
          <template #body="{ data }">
            <div class="query-stats">
              <div class="stat-item">
                <i class="pi pi-check-circle text-green-500"></i>
                <span>{{ data.success_count }}</span>
              </div>
              <div class="stat-item">
                <i class="pi pi-times-circle text-red-500"></i>
                <span>{{ data.error_count }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="actions" header="Actions" :sortable="false" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <OFButton 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Query'"
                @click="editQuery(data)" 
              />
              <OFButton 
                icon="pi pi-play" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Run Query'"
                @click="runQuery(data)" 
              />
              <OFButton 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Query'"
                @click="deleteQuery(data)" 
              />
            </div>
          </template>
        </Column>
      </ModuleTable>
    </div>

    <!-- Create Query Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog" 
      :header="dialogTitle"
      :modal="true"
      :draggable="false"
      :style="{ width: '60vw', maxWidth: '800px' }"
      class="p-dialog-custom"
      :pt="{
        root: { style: { position: 'relative', margin: '0 auto' } },
        mask: { style: { alignItems: 'center', justifyContent: 'center' } }
      }"
    >
      <div class="grid">
        <div class="col-12">
          <div class="field">
            <label for="name">Name</label>
            <InputText 
              id="name" 
              v-model="newQuery.name" 
              required 
              placeholder="Enter query name"
              :class="{ 'p-invalid': submitted && !newQuery.name }"
            />
            <small class="p-error" v-if="submitted && !newQuery.name">Name is required.</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="description">Description</label>
            <Textarea 
              id="description" 
              v-model="newQuery.description" 
              rows="3" 
              required
              placeholder="Enter query description"
              :class="{ 'p-invalid': submitted && !newQuery.description }"
            />
            <small class="p-error" v-if="submitted && !newQuery.description">Description is required.</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="platform">Platform</label>
            <Dropdown
              id="platform"
              v-model="newQuery.platform"
              :options="platformOptions"
              optionLabel="name"
              optionValue="value"
              placeholder="Select target platform"
              class="w-full"
              :panelClass="'surface-0'"
              :pt="{
                panel: { class: 'shadow-2 border-none' },
                item: { class: 'p-3 text-base hover:surface-hover' }
              }"
            />
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="query">Query</label>
            <ScriptEditor 
              id="query"
              v-model="newQuery.query" 
              :rows="12"
              required
              :error="submitted && !newQuery.query ? 'Query is required.' : ''"
              placeholder="Enter your query script here..."
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <OFButton 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="hideCreateDialog"
          />
          <OFButton 
            :label="isEditMode ? 'Update' : 'Create'" 
            icon="pi pi-check" 
            class="p-button-primary" 
            @click="isEditMode ? updateQuery() : createQuery()"
            :loading="submitting"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from 'vue-router';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import { FilterMatchMode } from "primevue/api";
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';
// Import from our new UI component library
import { 
  OFButton, 
  Column, 
  InputText, 
  Dialog, 
  Dropdown, 
  Tag,
  ScriptEditor 
} from '../../components/ui';

interface FleetResponse {
  queries: Query[];
}

interface Query {
  id: string;
  name: string;
  description: string;
  platform: string | null;
  query: string;
  success_count?: number;
  error_count?: number;
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/fleet/api/v1/fleet`;
const router = useRouter();
const toastService = ToastService.getInstance();

// Add directive registration
const vTooltip = Tooltip;

const loading = ref(true);
const error = ref('');
const queries = ref<Query[]>([]);
const showCreateDialog = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const isEditMode = ref(false);
const dialogTitle = computed(() => isEditMode.value ? 'Edit Query' : 'Create Query');

const newQuery = ref({
  id: null as string | null,
  name: '',
  description: '',
  platform: null as string | null,
  query: ''
});

const platformOptions = [
  { name: 'macOS', value: 'darwin' },
  { name: 'Windows', value: 'windows' },
  { name: 'Linux', value: 'linux' }
];

const filters = ref({
  global: { value: '', matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux'
  };
  return platformMap[platform] || platform;
};

const getPlatformSeverity = (platform: string) => {
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success'
  };
  return severityMap[platform] || 'info';
};

const fetchQueries = async () => {
  try {
    loading.value = true;
    const response = await restClient.get<FleetResponse>(`${API_URL}/queries`);
    queries.value = response.queries || [];
  } catch (error) {
    console.error('Failed to fetch queries:', error);
    toastService.showError('Failed to fetch queries');
  } finally {
    loading.value = false;
  }
};

const hideCreateDialog = () => {
  showCreateDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newQuery.value = {
    id: null,
    name: '',
    description: '',
    platform: null,
    query: ''
  };
};

const createQuery = async () => {
  try {
    submitted.value = true;
    if (!validateQuery()) return;

    submitting.value = true;
    await restClient.post(`${API_URL}/queries`, newQuery.value);
    hideCreateDialog();
    await fetchQueries();
    toastService.showSuccess('Query created successfully');
  } catch (error) {
    console.error('Failed to create query:', error);
    toastService.showError('Failed to create query');
  } finally {
    submitting.value = false;
  }
};

const editQuery = (query: Query) => {
  newQuery.value = { ...query };
  isEditMode.value = true;
  showCreateDialog.value = true;
};

const updateQuery = async () => {
  if (!newQuery.value.id) return;

  try {
    submitted.value = true;
    if (!validateQuery()) return;

    submitting.value = true;
    await restClient.put(`${API_URL}/queries/${newQuery.value.id}`, newQuery.value);
    hideCreateDialog();
    await fetchQueries();
    toastService.showSuccess('Query updated successfully');
  } catch (error) {
    console.error('Failed to update query:', error);
    toastService.showError('Failed to update query');
  } finally {
    submitting.value = false;
  }
};

const deleteQuery = async (query: Query) => {
  try {
    await restClient.delete(`${API_URL}/queries/${query.id}`);
    await fetchQueries();
    toastService.showSuccess('Query deleted successfully');
  } catch (error) {
    console.error('Failed to delete query:', error);
    toastService.showError('Failed to delete query');
  }
};

const runQuery = async (query: Query) => {
  try {
    const response = await restClient.post(`${API_URL}/queries/${query.id}/run`);
    toastService.showSuccess('Query executed successfully');
    await fetchQueries(); // Refresh to get updated counts
  } catch (error) {
    console.error('Failed to run query:', error);
    toastService.showError('Failed to run query');
  }
};

const validateQuery = () => {
  if (!newQuery.value.name || !newQuery.value.description || !newQuery.value.query) {
    return false;
  }
  return true;
};

onMounted(async () => {
  await fetchQueries();
});
</script>

<style>
:deep(.p-dialog-mask) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.p-dialog) {
  margin: 0 auto !important;
}

:deep(.p-dialog-content) {
  overflow-y: auto !important;
  max-height: calc(90vh - 120px) !important;
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

  .field {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }
  }

  .p-inputtext,
  .p-multiselect,
  .p-editor-container {
    width: 100%;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    transition: all 0.2s;

    &:hover {
      border-color: var(--primary-color);
    }

    &:focus,
    &.p-focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }

    &.p-invalid {
      border-color: var(--red-500);
    }
  }

  .p-editor-container {
    display: none;
  }
}

:deep(.ql-container) {
  background: var(--surface-ground) !important;
}

:deep(.ql-editor) {
  background: var(--surface-ground) !important;
}

.code-editor {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 1rem;
  background: var(--surface-ground);
  color: var(--text-color);
  border: none;
  border-radius: var(--border-radius);
  resize: vertical;
  transition: all 0.2s;
  outline: none !important;
}

.code-editor:hover {
  background: var(--surface-hover);
}

.code-editor:focus {
  background: var(--surface-hover);
  box-shadow: var(--focus-ring);
}

.code-editor::placeholder {
  color: var(--text-color-secondary);
  opacity: 0.7;
}

.code-editor.p-invalid {
  border-color: var(--red-500);
}
</style>

<style scoped>
.mdm-queries {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.queries-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  min-height: 0;
}

.query-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .query-name {
    font-weight: 500;
    color: var(--text-color);
  }

  .query-description {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
  }
}

.query-stats {
  display: flex;
  align-items: center;
  gap: 1rem;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;

    i {
      font-size: 1rem;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  background: var(--surface-card);
  border-radius: var(--border-radius);

  .empty-icon {
    font-size: 2.5rem;
    color: var(--text-color-secondary);
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
  }

  p {
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.5;

    &.hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
      opacity: 0.8;
    }
  }
}
</style>         