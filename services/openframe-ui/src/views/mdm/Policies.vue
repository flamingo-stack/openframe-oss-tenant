<template>
  <div class="mdm-policies">
    <div class="of-mdm-header">
      <h1 class="of-title">Policies</h1>
      <Button 
        label="Create Policy" 
        icon="pi pi-plus" 
        @click="showCreateDialog = true"
        class="p-button-primary" 
      />
    </div>

    <div class="w-30rem mr-auto">
      <div class="p-inputgroup">
        <span class="p-inputgroup-addon">
          <i class="pi pi-search"></i>
        </span>
        <InputText 
          v-model="filters['global'].value" 
          placeholder="Search policies..." 
        />
      </div>
    </div>

    <div class="policies-content">
      <DataTable 
        :value="policies" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        v-model:filters="filters"
        filterDisplay="menu"
        :loading="loading"
        :globalFilterFields="['name', 'description', 'platform']"
        stripedRows
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-shield empty-icon"></i>
            <h3>No Policies Found</h3>
            <p>There are no policies configured yet.</p>
            <p class="hint">Add policies to manage device settings and configurations.</p>
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i class="pi pi-shield mr-2"></i>
              <div class="policy-info">
                <span class="policy-name">{{ data.name }}</span>
                <span class="policy-description text-sm text-color-secondary">{{ data.description }}</span>
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

        <Column field="status" header="Status" sortable style="width: 150px">
          <template #body="{ data }">
            <Tag :value="isEnabled(data) ? 'Enabled' : 'Disabled'"
                 :severity="isEnabled(data) ? 'success' : 'danger'" />
          </template>
        </Column>

        <Column field="actions" header="Actions" :sortable="false" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Policy'"
                @click="editPolicy(data)" 
              />
              <Button 
                :icon="isEnabled(data) ? 'pi pi-pause' : 'pi pi-play'" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="isEnabled(data) ? 'Disable Policy' : 'Enable Policy'"
                @click="togglePolicy(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Policy'"
                @click="deletePolicy(data)" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Create Policy Dialog -->
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
              v-model="newPolicy.name" 
              required 
              placeholder="Enter policy name"
              :class="{ 'p-invalid': submitted && !newPolicy.name }"
            />
            <small class="p-error" v-if="submitted && !newPolicy.name">Name is required.</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label>Status</label>
            <div class="flex gap-4">
              <div class="status-option" :class="{ active: newPolicy.enabled }" @click="newPolicy.enabled = true">
                <div class="radio-button">
                  <div class="radio-inner"></div>
                </div>
                <div class="status-label">
                  <span class="status-title">Enabled</span>
                  <span class="status-description">Policy will be active and enforced</span>
                </div>
              </div>
              <div class="status-option" :class="{ active: !newPolicy.enabled }" @click="newPolicy.enabled = false">
                <div class="radio-button">
                  <div class="radio-inner"></div>
                </div>
                <div class="status-label">
                  <span class="status-title">Disabled</span>
                  <span class="status-description">Policy will be inactive and not enforced</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="description">Description</label>
            <Textarea 
              id="description" 
              v-model="newPolicy.description" 
              rows="3" 
              required
              placeholder="Enter policy description"
              :class="{ 'p-invalid': submitted && !newPolicy.description }"
            />
            <small class="p-error" v-if="submitted && !newPolicy.description">Description is required.</small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label for="platform">Platform</label>
            <Dropdown
              id="platform"
              v-model="newPolicy.platform"
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
            <textarea 
              v-model="newPolicy.query" 
              class="code-editor"
              rows="12"
              required
              :class="{ 'p-invalid': submitted && !newPolicy.query }"
              placeholder="Enter your policy query here..."
            ></textarea>
            <small class="p-error" v-if="submitted && !newPolicy.query">Query is required.</small>
            <small class="helper-text">
              To target specific devices, you can add conditions to your query using device properties like hostname, IP, etc.
              Example: SELECT 1 FROM system_info WHERE hostname IN ('device1', 'device2') AND ...
            </small>
          </div>
        </div>

        <div class="col-12">
          <div class="field">
            <label>Policy Scope</label>
            <div class="flex gap-4">
              <div class="status-option" :class="{ active: newPolicy.scope === 'global' }" @click="newPolicy.scope = 'global'">
                <div class="radio-button">
                  <div class="radio-inner"></div>
                </div>
                <div class="status-label">
                  <span class="status-title">Global Policy</span>
                  <span class="status-description">Policy will be applied to all devices</span>
                </div>
              </div>
              <div class="status-option" :class="{ disabled: true }" style="opacity: 0.6; cursor: not-allowed;">
                <div class="radio-button">
                  <div class="radio-inner"></div>
                </div>
                <div class="status-label">
                  <span class="status-title">Team Policy</span>
                  <span class="status-description">Requires Fleet Premium - Apply policy to specific teams</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="hideCreateDialog"
          />
          <Button 
            :label="isEditMode ? 'Update' : 'Create'" 
            icon="pi pi-check" 
            class="p-button-primary" 
            @click="isEditMode ? updatePolicy() : createPolicy()"
            :loading="submitting"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import Checkbox from 'primevue/checkbox';

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

const toast = useToast();
const loading = ref(true);
const error = ref('');
const policies = ref<Policy[]>([]);
const showCreateDialog = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const isEditMode = ref(false);
const dialogTitle = computed(() => isEditMode.value ? 'Edit Policy' : 'Create Policy');

interface Policy {
  id: string;
  name: string;
  query: string;
  critical: boolean;
  description: string;
  author_id: number;
  author_name: string;
  author_email: string;
  team_id: number | null;
  resolution: string;
  platform: string | null;
  calendar_events_enabled: boolean;
  created_at: string;
  updated_at: string;
  passing_host_count: number;
  failing_host_count: number;
  host_count_updated_at: string | null;
  enabled?: boolean;
  scope?: 'global' | 'team';
}

const newPolicy = ref({
  id: null as string | null,
  name: '',
  description: '',
  platform: null as string | null,
  query: '',
  enabled: true,
  scope: 'global' as 'global' | 'team',
  team_id: null as number | null
});

const platformOptions = [
  { name: 'macOS', value: 'darwin' },
  { name: 'Windows', value: 'windows' },
  { name: 'Linux', value: 'linux' }
];

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  if (!platform) return 'All Platforms';
  const platforms = platform.split(',');
  if (platforms.length > 1) return 'Multiple';
  
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux'
  };
  return platformMap[platform] || platform;
};

const getPlatformSeverity = (platform: string) => {
  if (!platform || platform.includes(',')) return 'info';
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success'
  };
  return severityMap[platform] || 'info';
};

const fetchPolicies = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await restClient.get(`${API_URL}/global/policies`);
    policies.value = response.policies || [];
  } catch (err) {
    console.error('Error fetching policies:', err);
    error.value = err instanceof Error ? err.message : 'Failed to fetch policies';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

const hideCreateDialog = () => {
  showCreateDialog.value = false;
  submitted.value = false;
  isEditMode.value = false;
  newPolicy.value = {
    id: null,
    name: '',
    description: '',
    platform: null,
    query: '',
    enabled: true,
    scope: 'global',
    team_id: null
  };
};

const createPolicy = async () => {
  submitted.value = true;

  if (!newPolicy.value.name || !newPolicy.value.description || !newPolicy.value.query) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fill in all required fields',
      life: 3000
    });
    return;
  }

  submitting.value = true;
  try {
    const endpoint = newPolicy.value.scope === 'global' 
      ? `${API_URL}/global/policies`
      : `${API_URL}/teams/${newPolicy.value.team_id}/policies`;

    await restClient.post(endpoint, {
      name: newPolicy.value.name,
      description: newPolicy.value.description,
      platform: newPolicy.value.platform || '',
      query: newPolicy.value.query,
      enabled: newPolicy.value.enabled
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Policy created successfully',
      life: 3000
    });

    hideCreateDialog();
    await fetchPolicies();
  } catch (err) {
    console.error('Error creating policy:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create policy',
      life: 5000
    });
  } finally {
    submitting.value = false;
  }
};

const isEnabled = (policy: Policy) => {
  return policy.passing_host_count > 0 || policy.failing_host_count > 0;
};

const togglePolicy = async (policy: Policy) => {
  try {
    await restClient.patch(`${API_URL}/global/policies/${policy.id}`, {
      name: policy.name,
      description: policy.description,
      platform: policy.platform || '',
      query: policy.query,
      enabled: !isEnabled(policy)
    });
    
    // Fetch fresh data instead of updating local state directly
    await fetchPolicies();
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Policy ${isEnabled(policy) ? 'disabled' : 'enabled'} successfully`,
      life: 3000
    });
  } catch (err) {
    console.error('Error toggling policy:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to toggle policy',
      life: 5000
    });
  }
};

const deletePolicy = async (policy: any) => {
  try {
    await restClient.post(`${API_URL}/global/policies/delete`, {
      ids: [policy.id]
    });
    await fetchPolicies();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Policy deleted successfully',
      life: 3000
    });
  } catch (err) {
    console.error('Error deleting policy:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete policy',
      life: 5000
    });
  }
};

const editPolicy = (policy: Policy) => {
  isEditMode.value = true;
  newPolicy.value = {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    platform: policy.platform || null,
    query: policy.query,
    enabled: policy.enabled ?? true,
    scope: policy.team_id ? 'team' : 'global',
    team_id: policy.team_id
  };
  showCreateDialog.value = true;
};

const updatePolicy = async () => {
  submitted.value = true;

  if (!newPolicy.value.name || !newPolicy.value.description || !newPolicy.value.query) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fill in all required fields',
      life: 3000
    });
    return;
  }

  submitting.value = true;
  try {
    await restClient.patch(`${API_URL}/global/policies/${newPolicy.value.id}`, {
      name: newPolicy.value.name,
      description: newPolicy.value.description,
      platform: newPolicy.value.platform || '',
      query: newPolicy.value.query,
      enabled: newPolicy.value.enabled
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Policy updated successfully',
      life: 3000
    });

    hideCreateDialog();
    await fetchPolicies();
  } catch (err) {
    console.error('Error updating policy:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update policy',
      life: 5000
    });
  } finally {
    submitting.value = false;
  }
};

// Add directive registration
const vTooltip = Tooltip;

onMounted(() => {
  fetchPolicies();
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

  .field-checkbox {
    display: flex;
    align-items: center;
    margin-top: 1rem;

    label {
      margin: 0;
      margin-left: 0.5rem;
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

.status-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--border-radius);
  background: var(--surface-ground);
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  border: 1px solid transparent;
}

.status-option:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
}

.status-option.active {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.radio-button {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--surface-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.status-option.active .radio-button {
  border-color: var(--primary-color);
}

.radio-inner {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s ease;
}

.status-option.active .radio-inner {
  background: var(--primary-color);
}

.status-option.active .status-title {
  color: var(--text-color);
  font-weight: 600;
}

.status-option.active .status-description {
  color: var(--text-color-secondary);
}

/* Dark mode overrides */
:deep([data-theme="dark"]) {
  .status-option.active {
    background: var(--yellow-900);
    border: 1px solid var(--yellow-500);
  }

  .status-option.active .radio-button {
    border-color: var(--yellow-500);
  }

  .status-option.active .radio-inner {
    background: var(--yellow-500);
  }

  .status-option.active .status-title {
    color: var(--yellow-50);
  }

  .status-option.active .status-description {
    color: var(--yellow-200);
  }
}

.status-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-title {
  font-weight: 600;
  color: var(--text-color);
}

.status-description {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

/* Remove the tooltip styles */
:deep(.p-tooltip),
:deep(.p-tooltip .p-tooltip-arrow),
:deep(.p-tooltip .p-tooltip-text) {
  display: none;
}

.helper-text {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>

<style scoped>
.mdm-policies {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--surface-ground);
}

.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.policies-content {
  flex: 1;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.policy-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .policy-name {
    font-weight: 500;
  }

  .policy-description {
    color: var(--text-color-secondary);
  }
}

:deep(.p-datatable) {
  .p-datatable-wrapper {
    border-radius: var(--border-radius);
    background: var(--surface-card);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .p-datatable-header {
    background: var(--surface-card);
    padding: 1.5rem;
    border: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-datatable-thead > tr > th {
    background: var(--surface-card);
    color: var(--text-color-secondary);
    padding: 1rem 1.5rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    border-bottom: 2px solid var(--surface-border);

    &:first-child {
      border-top-left-radius: var(--border-radius);
    }

    &:last-child {
      border-top-right-radius: var(--border-radius);
    }
  }

  .p-datatable-tbody > tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    > td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;

      .pi {
        font-size: 1.125rem;
        color: var(--primary-color);

        &.pi-shield {
          color: var(--text-color-secondary);
          opacity: 0.7;
        }
      }
    }

    &:last-child {
      border-bottom: none;
      
      > td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }
      
      > td:last-child {
        border-bottom-right-radius: var(--border-radius);
      }
    }
  }

  .p-paginator {
    background: var(--surface-ground);
    border: none;
    padding: 1.25rem 1rem;
    margin-top: 1rem;
    border-radius: var(--border-radius);

    .p-paginator-pages .p-paginator-page {
      min-width: 2.5rem;
      height: 2.5rem;
      margin: 0 0.25rem;
      border-radius: var(--border-radius);
      font-weight: 600;
      transition: all 0.2s ease;

      &.p-highlight {
        background: var(--primary-color);
        color: var(--primary-color-text);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
      }

      &:not(.p-highlight):hover {
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
    }
  }
}

:deep(.p-tag) {
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-tag-success {
    background: var(--green-50);
    color: var(--green-900);
    border: 1px solid var(--green-200);
  }

  &.p-tag-danger {
    background: var(--red-50);
    color: var(--red-900);
    border: 1px solid var(--red-200);
  }

  &.p-tag-warning {
    background: var(--yellow-50);
    color: var(--yellow-900);
    border: 1px solid var(--yellow-200);
  }

  &.p-tag-info {
    background: var(--blue-50);
    color: var(--blue-900);
    border: 1px solid var(--blue-200);
  }
}

:deep(.p-button.p-button-icon-only) {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;

  &.p-button-text:enabled:hover {
    background: var(--surface-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-button-danger:enabled:hover {
    background: var(--red-50);
    color: var(--red-900);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .pi {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  &:hover .pi {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--surface-card);
  border-radius: var(--border-radius);

  .empty-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
    margin-bottom: 1.5rem;
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