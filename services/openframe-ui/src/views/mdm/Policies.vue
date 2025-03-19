<template>
  <div class="mdm-policies">
    <ModuleHeader title="Policies">
      <template #actions>
        <Button 
          label="Create Policy" 
          icon="pi pi-plus" 
          @click="showCreateDialog = true"
          class="p-button-primary" 
        />
      </template>
    </ModuleHeader>

    <div class="policies-content">
      <SearchBar
        v-model="filters['global'].value"
        placeholder="Search policies..."
      />

      <ModuleTable
        :items="policies"
        :loading="loading"
        :searchFields="['name', 'description', 'platform']"
        emptyIcon="pi pi-shield"
        emptyTitle="No Policies Found"
        emptyMessage="There are no policies configured yet."
        emptyHint="Add policies to manage device settings and configurations."
      >
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
      </ModuleTable>
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
import { ref, onMounted, computed } from "@vue/runtime-core";
import { useRouter } from 'vue-router';
import ModuleTable from '../../components/shared/ModuleTable.vue';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import { FilterMatchMode } from "primevue/api";
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from '../../config/config.service';
import { ToastService } from "../../services/ToastService";
import Checkbox from "primevue/checkbox";
import ModuleHeader from '../../components/shared/ModuleHeader.vue';
import SearchBar from '../../components/shared/SearchBar.vue';

interface FleetResponse {
  policies: Policy[];
}

interface Policy {
  id: string;
  name: string;
  description: string;
  platform: string | null;
  query: string;
  enabled: boolean;
  scope: 'global' | 'team';
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const VITE_API_URL = `${runtimeConfig.gatewayUrl}/tools/fleet/api/v1/fleet`;
const router = useRouter();
const toastService = ToastService.getInstance();

// Add directive registration
const vTooltip = Tooltip;

const loading = ref(true);
const error = ref('');
const policies = ref<Policy[]>([]);
const showCreateDialog = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const isEditMode = ref(false);
const dialogTitle = computed(() => isEditMode.value ? 'Edit Policy' : 'Create Policy');

const newPolicy = ref({
  id: null as string | null,
  name: '',
  description: '',
  platform: null as string | null,
  query: '',
  enabled: true,
  scope: 'global' as 'global' | 'team'
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

const isEnabled = (policy: Policy) => {
  return policy.enabled;
};

const fetchPolicies = async () => {
  try {
    loading.value = true;
    const response = await restClient.get<FleetResponse>(`${VITE_API_URL}/global/policies`);
    policies.value = response.policies || [];
  } catch (error) {
    console.error('Failed to fetch policies:', error);
    toastService.showError('Failed to fetch policies');
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
    scope: 'global'
  };
};

const createPolicy = async () => {
  try {
    submitted.value = true;
    if (!validatePolicy()) return;

    submitting.value = true;
    await restClient.post(`${VITE_API_URL}/global/policies`, newPolicy.value);
    hideCreateDialog();
    await fetchPolicies();
    toastService.showSuccess('Policy created successfully');
  } catch (error) {
    console.error('Failed to create policy:', error);
    toastService.showError('Failed to create policy');
  } finally {
    submitting.value = false;
  }
};

const editPolicy = (policy: Policy) => {
  newPolicy.value = { ...policy };
  isEditMode.value = true;
  showCreateDialog.value = true;
};

const updatePolicy = async () => {
  if (!newPolicy.value.id) return;

  try {
    submitted.value = true;
    if (!validatePolicy()) return;

    submitting.value = true;
    await restClient.put(`${VITE_API_URL}/global/policies/${newPolicy.value.id}`, newPolicy.value);
    hideCreateDialog();
    await fetchPolicies();
    toastService.showSuccess('Policy updated successfully');
  } catch (error) {
    console.error('Failed to update policy:', error);
    toastService.showError('Failed to update policy');
  } finally {
    submitting.value = false;
  }
};

const deletePolicy = async (policy: Policy) => {
  try {
    await restClient.delete(`${VITE_API_URL}/global/policies/${policy.id}`);
    await fetchPolicies();
    toastService.showSuccess('Policy deleted successfully');
  } catch (error) {
    console.error('Failed to delete policy:', error);
    toastService.showError('Failed to delete policy');
  }
};

const togglePolicy = async (policy: Policy) => {
  try {
    await restClient.put(`${VITE_API_URL}/global/policies/${policy.id}`, {
      ...policy,
      enabled: !policy.enabled
    });
    await fetchPolicies();
    toastService.showSuccess(`Policy ${policy.enabled ? 'disabled' : 'enabled'} successfully`);
  } catch (error) {
    console.error('Failed to toggle policy:', error);
    toastService.showError('Failed to toggle policy');
  }
};

const validatePolicy = () => {
  if (!newPolicy.value.name || !newPolicy.value.description || !newPolicy.value.query) {
    return false;
  }
  return true;
};

onMounted(async () => {
  await fetchPolicies();
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
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.policies-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  min-height: 0;
}

.policy-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .policy-name {
    font-weight: 500;
    color: var(--text-color);
  }

  .policy-description {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
  }
}

:deep(.p-tag) {
  min-width: 75px;
  justify-content: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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