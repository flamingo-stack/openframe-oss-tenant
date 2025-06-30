<template>
  <div class="api-keys-page">
    <div class="page-header">
      <h1 class="page-title">API Keys</h1>
      <p class="page-description">
        Manage your API keys for programmatic access to OpenFrame
      </p>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && apiKeys.length === 0" class="empty-state">
      <div class="empty-state-content">
        <i class="pi pi-shield empty-state-icon"></i>
        <h3 class="empty-state-title">No API Keys</h3>
        <p class="empty-state-description">
          Create your first API key to start using the OpenFrame API programmatically.
        </p>
        <OFButton 
          @click="openCreateDialog"
          severity="primary"
          size="large"
          class="empty-state-button"
        >
          <i class="pi pi-plus"></i>
          Create API Key
        </OFButton>
      </div>
    </div>

    <!-- API Keys list -->
    <div v-else class="api-keys-content">
      <div class="content-header">
        <div class="content-actions">
          <OFButton 
            @click="openCreateDialog"
            severity="primary"
          >
            <i class="pi pi-plus"></i>
            Create API Key
          </OFButton>
        </div>
      </div>

      <div class="api-keys-list">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>Loading API keys...</span>
        </div>
        
        <div v-else-if="apiKeys.length === 0" class="no-keys-message">
          <p>No API keys found.</p>
        </div>
        
        <div v-else class="api-keys-grid">
          <div 
            v-for="apiKey in apiKeys" 
            :key="apiKey.id" 
            class="api-key-card"
          >
            <div class="card-header">
              <div class="key-info">
                <h3 class="key-name">{{ apiKey.name }}</h3>
                <p v-if="apiKey.description" class="key-description">{{ apiKey.description }}</p>
              </div>
              <div class="key-status">
                <Tag 
                  :value="ApiKeyService.getStatusText(apiKey)"
                  :severity="getTagSeverity(apiKey)"
                />
              </div>
            </div>
            
            <div class="card-body">
              <div class="key-details">
                <div class="detail-row">
                  <label>Key ID:</label>
                  <div class="key-id-container">
                    <code class="key-id">{{ ApiKeyService.formatKeyForDisplay(apiKey.id) }}</code>
                    <i 
                      class="pi pi-copy copy-icon"
                      @click="copyToClipboard(apiKey.id)"
                      title="Copy Key ID"
                    ></i>
                  </div>
                </div>
                
                <div class="detail-row">
                  <label>Usage:</label>
                  <div class="usage-info">
                    <span class="usage-count">{{ apiKey.totalRequests || 0 }} requests</span>
                    <small v-if="apiKey.lastUsed" class="last-used">
                      Last used: {{ formatDate(apiKey.lastUsed) }}
                    </small>
                    <small v-else class="never-used">Never used</small>
                  </div>
                </div>
                
                <div class="detail-row">
                  <label>Created:</label>
                  <div class="date-info">
                    <span>{{ formatDate(apiKey.createdAt) }}</span>
                    <small v-if="apiKey.expiresAt" class="expires-info">
                      Expires: {{ formatDate(apiKey.expiresAt) }}
                    </small>
                    <small v-else class="no-expiry">No expiration</small>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card-actions">
              <OFButton 
                @click="viewApiKey(apiKey)"
                severity="info"
                size="small"
                title="View details"
              >
                <i class="pi pi-eye"></i>
                View
              </OFButton>
              <OFButton 
                @click="editApiKey(apiKey)"
                severity="primary"
                size="small"
                title="Edit"
              >
                <i class="pi pi-pencil"></i>
                Edit
              </OFButton>
              <OFButton 
                @click="toggleApiKey(apiKey)"
                :severity="apiKey.enabled ? 'warning' : 'success'"
                size="small"
                :title="apiKey.enabled ? 'Disable' : 'Enable'"
              >
                <i :class="apiKey.enabled ? 'pi pi-ban' : 'pi pi-check'"></i>
                {{ apiKey.enabled ? 'Disable' : 'Enable' }}
              </OFButton>
              <OFButton 
                @click="confirmRegenerateApiKey(apiKey)"
                severity="secondary"
                size="small"
                title="Regenerate"
              >
                <i class="pi pi-refresh"></i>
                Regenerate
              </OFButton>
              <OFButton 
                @click="confirmDeleteApiKey(apiKey)"
                severity="danger"
                size="small"
                title="Delete"
              >
                <i class="pi pi-trash"></i>
                Delete
              </OFButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit API Key Dialog -->
    <Dialog 
      v-model:visible="showCreateDialog"
      :header="editingApiKey ? 'Edit API Key' : 'Create API Key'"
      modal
      :appendTo="'body'"
      :draggable="false"
      :breakpoints="{ '960px': '95vw', '640px': '100vw' }"
      class="api-key-dialog"
      :style="{ width: '460px' }"
    >
      <form @submit.prevent="submitApiKey" class="api-key-form">
        <div class="form-field">
          <label for="name" class="field-label">Name *</label>
          <InputText 
            id="name"
            v-model="formData.name"
            placeholder="Enter API key name"
            required
            class="field-input"
          />
        </div>

        <div class="form-field">
          <label for="description" class="field-label">Description</label>
          <Textarea 
            id="description"
            v-model="formData.description"
            placeholder="Enter API key description (optional)"
            rows="3"
            class="field-input"
          />
        </div>

        <div class="form-field">
          <label for="expiresAt" class="field-label">Expiration Date</label>
          <Calendar 
            id="expiresAt"
            v-model="formData.expiresAt"
            placeholder="Select expiration date (optional)"
            :minDate="new Date()"
            showIcon
            class="field-input"
          />
          <small class="field-hint">Leave empty for no expiration</small>
        </div>

        <div class="form-actions">
          <OFButton 
            type="button"
            @click="closeDialog"
            severity="secondary"
          >
            Cancel
          </OFButton>
          <OFButton 
            type="submit"
            severity="primary"
            :loading="submitting"
          >
            {{ editingApiKey ? 'Update' : 'Create' }} API Key
          </OFButton>
        </div>
      </form>
    </Dialog>

    <!-- API Key Details Dialog -->
    <Dialog 
      v-model:visible="showDetailsDialog"
      header="API Key Details"
      modal
      class="details-dialog"
      :style="{ width: '600px' }"
    >
      <div v-if="selectedApiKey" class="api-key-details">
        <div class="detail-section">
          <h3>Basic Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name:</label>
              <span>{{ selectedApiKey.name }}</span>
            </div>
            <div class="detail-item">
              <label>Description:</label>
              <span>{{ selectedApiKey.description || 'No description' }}</span>
            </div>
            <div class="detail-item">
              <label>Key ID:</label>
              <code>{{ selectedApiKey.id }}</code>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <Tag 
                :value="ApiKeyService.getStatusText(selectedApiKey)"
                :severity="getTagSeverity(selectedApiKey)"
              />
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Usage Statistics</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Total Requests:</label>
              <span>{{ selectedApiKey.totalRequests || 0 }}</span>
            </div>
            <div class="detail-item">
              <label>Successful Requests:</label>
              <span>{{ selectedApiKey.successfulRequests || 0 }}</span>
            </div>
            <div class="detail-item">
              <label>Failed Requests:</label>
              <span>{{ selectedApiKey.failedRequests || 0 }}</span>
            </div>
            <div class="detail-item">
              <label>Created:</label>
              <span>{{ formatDate(selectedApiKey.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <label>Last Used:</label>
              <span>{{ selectedApiKey.lastUsed ? formatDate(selectedApiKey.lastUsed) : 'Never' }}</span>
            </div>
            <div class="detail-item">
              <label>Expires:</label>
              <span>{{ selectedApiKey.expiresAt ? formatDate(selectedApiKey.expiresAt) : 'Never' }}</span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Secret Key Display Dialog -->
    <Dialog 
      v-model:visible="showSecretDialog"
      header="API Key Created"
      modal
      class="secret-dialog"
      :style="{ width: '600px' }"
      :closable="false"
    >
      <div class="secret-content">
        <div class="warning-message">
          <i class="pi pi-exclamation-triangle"></i>
          <div>
            <strong>Important:</strong> This is the only time you'll see the complete API key. 
            Please copy it and store it securely.
          </div>
        </div>

        <div class="secret-display">
          <label class="secret-label">Your API Key:</label>
          <div class="secret-key-container">
            <code class="secret-key">{{ newSecretKey }}</code>
          </div>
          <div class="secret-key-actions">
            <OFButton 
              @click="copyToClipboard(newSecretKey)"
              severity="secondary"
              size="small"
              class="copy-secret-button"
            >
              <i class="pi pi-copy"></i>
              Copy to Clipboard
            </OFButton>
          </div>
        </div>

        <div class="secret-actions">
          <OFButton 
            @click="closeSecretDialog"
            severity="primary"
          >
            I've Saved the Key
          </OFButton>
        </div>
      </div>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog 
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      modal
      class="delete-dialog"
      :style="{ width: '400px' }"
    >
      <div class="delete-content">
        <div class="delete-message">
          <i class="pi pi-exclamation-triangle delete-icon"></i>
          <div>
            <p>Are you sure you want to delete this API key?</p>
            <p><strong>{{ apiKeyToDelete?.name }}</strong></p>
            <p class="delete-warning">This action cannot be undone.</p>
          </div>
        </div>

        <div class="delete-actions">
          <OFButton 
            @click="showDeleteDialog = false"
            severity="secondary"
          >
            Cancel
          </OFButton>
          <OFButton 
            @click="deleteApiKey"
            severity="danger"
            :loading="deleting"
          >
            Delete
          </OFButton>
        </div>
      </div>
    </Dialog>

    <!-- Regenerate Confirmation Dialog -->
    <Dialog 
      v-model:visible="showRegenerateDialog"
      header="Confirm Regenerate"
      modal
      class="regenerate-dialog"
      :style="{ width: '400px' }"
    >
      <div class="regenerate-content">
        <div class="regenerate-message">
          <i class="pi pi-exclamation-triangle regenerate-icon"></i>
          <div>
            <p>Are you sure you want to regenerate this API key?</p>
            <p><strong>{{ apiKeyToRegenerate?.name }}</strong></p>
            <p class="regenerate-warning">The current key will stop working immediately.</p>
          </div>
        </div>

        <div class="regenerate-actions">
          <OFButton 
            @click="showRegenerateDialog = false"
            severity="secondary"
          >
            Cancel
          </OFButton>
          <OFButton 
            @click="regenerateApiKey"
            severity="primary"
            :loading="regenerating"
          >
            Regenerate
          </OFButton>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import { OFButton } from '@/components/ui';
import { ApiKeyService } from '@/services/ApiKeyService';
import type { ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest } from '@/services/ApiKeyService';
import { ToastService } from '@/services/ToastService';

// Reactive data
const apiKeys = ref<ApiKey[]>([]);
const loading = ref(true);
const submitting = ref(false);
const deleting = ref(false);
const regenerating = ref(false);

// Dialog states
const showCreateDialog = ref(false);
const showDetailsDialog = ref(false);
const showSecretDialog = ref(false);
const showDeleteDialog = ref(false);
const showRegenerateDialog = ref(false);

// Selected items
const selectedApiKey = ref<ApiKey | null>(null);
const editingApiKey = ref<ApiKey | null>(null);
const apiKeyToDelete = ref<ApiKey | null>(null);
const apiKeyToRegenerate = ref<ApiKey | null>(null);
const newSecretKey = ref('');

// Toast service
const toastService = ToastService.getInstance();

// Form data
const formData = reactive({
  name: '',
  description: '',
  expiresAt: null as Date | null
});

// Methods
onMounted(async () => {
  // Wait for auth to be ready before loading API keys
  await waitForAuth();
  await loadApiKeys();
});

// Add auth readiness check
async function waitForAuth() {
  const maxAttempts = 10;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const token = localStorage.getItem('access_token');
    if (token) {
      console.log('🔑 [ApiKeys] Auth token ready, loading API keys...');
      return;
    }
    
    console.log(`🔑 [ApiKeys] Waiting for auth token... (${attempts + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  console.warn('🔑 [ApiKeys] Auth token not ready after waiting, trying anyway...');
}

async function loadApiKeys() {
  try {
    loading.value = true;
    apiKeys.value = await ApiKeyService.getApiKeys();
  } catch (error) {
    console.error('Failed to load API keys:', error);
    toastService.showError('Failed to load API keys');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formData.name = '';
  formData.description = '';
  formData.expiresAt = null;
}

function openCreateDialog() {
  editingApiKey.value = null;
  resetForm();
  showCreateDialog.value = true;
}

function closeDialog() {
  showCreateDialog.value = false;
  editingApiKey.value = null;
  resetForm();
}

function editApiKey(apiKey: ApiKey) {
  editingApiKey.value = apiKey;
  formData.name = apiKey.name;
  formData.description = apiKey.description || '';
  formData.expiresAt = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null;
  showCreateDialog.value = true;
}

async function submitApiKey() {
  try {
    submitting.value = true;
    
    const request = {
      name: formData.name,
      description: formData.description || undefined,
      expiresAt: formData.expiresAt?.toISOString()
    };

    if (editingApiKey.value) {
      // Update existing API key
      await ApiKeyService.updateApiKey(editingApiKey.value.id, request);
      toastService.showSuccess('API key updated successfully');
    } else {
      // Create new API key
      const response = await ApiKeyService.createApiKey(request);
      newSecretKey.value = response.fullKey;
      showSecretDialog.value = true;
      toastService.showSuccess('API key created successfully');
    }

    closeDialog();
    await loadApiKeys();
  } catch (error) {
    console.error('Failed to save API key:', error);
    toastService.showError('Failed to save API key');
  } finally {
    submitting.value = false;
  }
}

function viewApiKey(apiKey: ApiKey) {
  selectedApiKey.value = apiKey;
  showDetailsDialog.value = true;
}

async function toggleApiKey(apiKey: ApiKey) {
  try {
    await ApiKeyService.toggleApiKey(apiKey.id, !apiKey.enabled);
    toastService.showSuccess(`API key ${apiKey.enabled ? 'disabled' : 'enabled'} successfully`);
    await loadApiKeys();
  } catch (error) {
    console.error('Failed to toggle API key:', error);
    toastService.showError('Failed to toggle API key');
  }
}

function confirmDeleteApiKey(apiKey: ApiKey) {
  apiKeyToDelete.value = apiKey;
  showDeleteDialog.value = true;
}

async function deleteApiKey() {
  if (!apiKeyToDelete.value) return;

  try {
    deleting.value = true;
    await ApiKeyService.deleteApiKey(apiKeyToDelete.value.id);
    toastService.showSuccess('API key deleted successfully');
    showDeleteDialog.value = false;
    await loadApiKeys();
  } catch (error) {
    console.error('Failed to delete API key:', error);
    toastService.showError('Failed to delete API key');
  } finally {
    deleting.value = false;
    apiKeyToDelete.value = null;
  }
}

function confirmRegenerateApiKey(apiKey: ApiKey) {
  apiKeyToRegenerate.value = apiKey;
  showRegenerateDialog.value = true;
}

async function regenerateApiKey() {
  if (!apiKeyToRegenerate.value) return;

  try {
    regenerating.value = true;
    const response = await ApiKeyService.regenerateApiKey(apiKeyToRegenerate.value.id);
    newSecretKey.value = response.fullKey;
    showRegenerateDialog.value = false;
    showSecretDialog.value = true;
    toastService.showSuccess('API key regenerated successfully');
    await loadApiKeys();
  } catch (error) {
    console.error('Failed to regenerate API key:', error);
    toastService.showError('Failed to regenerate API key');
  } finally {
    regenerating.value = false;
  }
}

function closeSecretDialog() {
  showSecretDialog.value = false;
  newSecretKey.value = '';
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toastService.showSuccess('Copied to clipboard');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toastService.showError('Failed to copy to clipboard');
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTagSeverity(apiKey: ApiKey): string {
  const color = ApiKeyService.getStatusColor(apiKey);
  switch (color) {
    case 'green': return 'success';
    case 'orange': return 'warning';
    case 'red': return 'danger';
    default: return 'info';
  }
}
</script>

<style scoped>
.api-keys-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-state-content {
  text-align: center;
  max-width: 400px;
}

.empty-state-icon {
  font-size: 64px;
  color: var(--text-color-secondary);
  margin-bottom: 24px;
}

.empty-state-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.empty-state-description {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.empty-state-button {
  gap: 8px;
}

/* Content */
.api-keys-content {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.content-actions {
  display: flex;
  gap: 12px;
}

/* Table */
.api-keys-list {
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  min-height: 400px;
  color: var(--text-color-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--surface-200);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-keys-message {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: var(--text-color-secondary);
}

.api-keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.api-key-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.api-key-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.key-info {
  flex: 1;
}

.key-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.key-description {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.key-status {
  flex-shrink: 0;
}

.card-body {
  margin-bottom: 20px;
}

.key-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.key-id-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-900);
  border: 1px solid var(--surface-border);
  padding: 8px 12px;
  border-radius: 6px;
}

.key-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: var(--surface-0);
  background: none;
  border: none;
  flex: 1;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: none;
}

.copy-button {
  padding: 4px 8px !important;
  min-width: auto !important;
}

.usage-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.usage-count {
  font-weight: 500;
  color: var(--text-color);
}

.last-used,
.never-used,
.expires-info,
.no-expiry {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid var(--surface-border);
  padding-top: 16px;
}

.card-actions .of-button {
  flex: 1;
  min-width: 80px;
  justify-content: center;
}

/* Dialog Styles */
.api-key-dialog {
  border-radius: 12px;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
}

.api-key-dialog :deep(.p-dialog-header) {
  padding: 16px 24px;
  border-bottom: 1px solid var(--surface-border);
}

.api-key-dialog :deep(.p-dialog-content) {
  padding: 24px;
}

/* All dialogs positioning */
.p-dialog {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  border-radius: 12px !important;
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
  max-height: 90vh !important;
  overflow: auto !important;
}

.p-dialog-header {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border-bottom: 1px solid var(--surface-border) !important;
  padding: 16px 24px !important;
}

.p-dialog-content {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  padding: 24px !important;
}

.p-dialog-title {
  color: var(--text-color) !important;
  font-weight: 600 !important;
}

.p-dialog-header-icon {
  color: var(--text-color-secondary) !important;
}

.p-dialog-header-close {
  color: var(--text-color-secondary) !important;
}

.p-dialog-header-close:hover {
  background: var(--surface-hover) !important;
  color: var(--text-color) !important;
}

/* Details Dialog */
.api-key-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span,
.detail-item code {
  font-size: 14px;
  color: var(--text-color);
}

/* Secret Dialog */
.secret-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.warning-message {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 8px;
  color: var(--orange-900);
}

.warning-message i {
  font-size: 20px;
  color: var(--orange-600);
  margin-top: 2px;
}

.secret-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.secret-label {
  font-weight: 500;
  color: var(--text-color);
}

.secret-key-container {
  display: flex;
  width: 100%;
}

.secret-key {
  flex: 1;
  width: 100%;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  background: var(--surface-900);
  color: var(--surface-0);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  word-break: keep-all;
  white-space: nowrap;
  overflow-x: auto;
  line-height: 1.5;
  letter-spacing: 0.5px;
  text-align: left;
  display: block;
  user-select: all;
  cursor: text;
}

.secret-key-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.copy-secret-button {
  min-width: 140px;
}

/* Delete/Regenerate Dialogs */
.delete-content,
.regenerate-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.delete-message,
.regenerate-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.delete-icon,
.regenerate-icon {
  font-size: 20px;
  color: var(--red-500);
  margin-top: 2px;
}

.delete-warning,
.regenerate-warning {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin: 8px 0 0 0;
}

.delete-actions,
.regenerate-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .api-keys-page {
    padding: 16px;
  }
  
  .api-keys-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .card-actions {
    flex-direction: column;
  }
  
  .card-actions .of-button {
    flex: none;
    width: 100%;
  }
}

.api-key-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 14px;
}

.field-input {
  width: 100%;
}

.field-hint {
  color: var(--text-color-secondary);
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.secret-actions {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--surface-border);
}
</style>

<style>
/* Global dialog positioning - affects all PrimeVue dialogs */
.p-dialog {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  border-radius: 12px !important;
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
  max-height: 90vh !important;
  overflow: auto !important;
}

.p-dialog-header {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border-bottom: 1px solid var(--surface-border) !important;
  padding: 16px 24px !important;
}

.p-dialog-content {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  padding: 24px !important;
}

.p-dialog-title {
  color: var(--text-color) !important;
  font-weight: 600 !important;
}

.p-dialog-header-icon {
  color: var(--text-color-secondary) !important;
}

.p-dialog-header-close {
  color: var(--text-color-secondary) !important;
}

.p-dialog-header-close:hover {
  background: var(--surface-hover) !important;
  color: var(--text-color) !important;
}

/* Button styling and spacing */
.of-button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  padding: 8px 12px !important;
  min-width: auto !important;
  white-space: nowrap !important;
}

.of-button.p-button-sm {
  padding: 6px 10px !important;
  font-size: 12px !important;
  gap: 4px !important;
}

/* Remove default PrimeVue icon margins */
.of-button .pi {
  margin: 0 !important;
}

/* Copy icon styling */
.copy-icon {
  cursor: pointer;
  color: var(--primary-color);
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.copy-icon:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

/* Card actions spacing */
.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Ensure proper spacing in key-id container */
.key-id-container {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.key-id {
  flex: 1;
  word-break: break-all;
  overflow-wrap: break-word;
  line-height: 1.4;
}
</style> 