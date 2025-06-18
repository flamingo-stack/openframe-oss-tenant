<template>
  <div class="of-card">
    <div class="of-card-header">
      <i class="pi pi-key"></i>
      <span>Single Sign-On Configuration</span>
      <div v-if="configData" class="status-indicator">
        <span 
          :class="['status-badge', configData.enabled ? 'status-enabled' : 'status-disabled']"
        >
          <i :class="configData.enabled ? 'pi pi-check-circle' : 'pi pi-pause-circle'"></i>
          {{ configData.enabled ? 'Enabled' : 'Disabled' }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="of-loading">
      <div class="of-spinner"></div>
      <span class="of-text-secondary">Loading configuration...</span>
    </div>

    <div v-else class="of-card-content">
      <!-- Configuration Form -->
      <div class="of-form-container">
        <form @submit.prevent="handleSubmit" class="of-form">
          <!-- Provider Selection - Dynamic loading from available providers -->
          <div class="of-form-group">
            <label class="of-form-label">OAuth Provider</label>
            <OFDropdown
              v-model="selectedProvider"
              :options="availableProviders"
              optionLabel="displayName"
              optionValue="provider"
              placeholder="Select OAuth Provider"
              class="of-form-field-wide"
              @change="onProviderChange"
              :loading="loadingProviders"
            />
            <small v-if="!availableProviders.length && !loadingProviders" class="p-error">
              No OAuth providers available. Please contact your administrator.
            </small>
          </div>

          <div v-if="selectedProvider" class="of-form-group">
            <label for="clientId" class="of-form-label">Client ID *</label>
            <InputText
              id="clientId"
              v-model="form.clientId"
              type="text"
              required
              placeholder="Enter OAuth Client ID"
              :class="{ 'p-invalid': errors.clientId, 'of-form-field-wide': true }"
            />
            <small v-if="errors.clientId" class="p-error">{{ errors.clientId }}</small>
          </div>

          <div v-if="selectedProvider" class="of-form-group">
            <label for="clientSecret" class="of-form-label">Client Secret *</label>
            <Password
              id="clientSecret"
              v-model="form.clientSecret"
              :feedback="false"
              toggleMask
              required
              placeholder="Enter OAuth Client Secret"
              :class="{ 'p-invalid': errors.clientSecret, 'of-form-field-wide': true }"
            />
            <small v-if="errors.clientSecret" class="p-error">{{ errors.clientSecret }}</small>
          </div>

          <!-- Form Actions -->
          <div v-if="selectedProvider" class="of-form-actions">
            <div class="of-form-actions-left">
              <OFButton
                v-if="configData"
                :label="configData.enabled ? 'Disable' : 'Enable'"
                :icon="configData.enabled ? 'pi pi-pause' : 'pi pi-play'"
                :severity="configData.enabled ? 'warning' : 'success'"
                variant="outlined"
                @click="toggleConfiguration"
                :disabled="saving"
                class="mr-2"
              />
              <OFButton
                v-if="configData"
                label="Delete Configuration"
                icon="pi pi-trash"
                severity="danger"
                variant="outlined"
                @click="deleteConfiguration"
                :disabled="saving"
              />
            </div>
            <div class="of-form-actions-right">
              <OFButton
                label="Reset"
                icon="pi pi-refresh"
                variant="text"
                @click="resetForm"
                :disabled="saving"
              />
              <OFButton
                type="submit"
                :label="saving ? 'Saving...' : 'Save Configuration'"
                icon="pi pi-save"
                :loading="saving"
                :disabled="!selectedProvider"
              />
            </div>
          </div>
        </form>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="of-message of-message-success">
        <i class="pi pi-check-circle"></i>
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="of-message of-message-error">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { ssoService } from '@/services/SSOService';
import type { SSOConfigResponse, SSOConfigRequest, SSOProviderInfo } from '@/types/sso';
import { OFButton, OFDropdown } from '@/components/ui';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

const selectedProvider = ref<string>('');
const loading = ref(false);
const loadingProviders = ref(false);
const saving = ref(false);
const configData = ref<SSOConfigResponse | null>(null);
const successMessage = ref('');
const errorMessage = ref('');
const availableProviders = ref<SSOProviderInfo[]>([]);

const form = reactive({
  clientId: '',
  clientSecret: ''
});

const errors = reactive<{ clientId?: string; clientSecret?: string }>({});

onMounted(() => {
  loadAvailableProviders();
});

// Watch for provider changes to load config
watch(selectedProvider, (newProvider) => {
  if (newProvider) {
    loadProviderConfig();
  } else {
    configData.value = null;
    resetForm();
  }
});

async function loadAvailableProviders() {
  loadingProviders.value = true;
  errorMessage.value = '';
  
  try {
    availableProviders.value = await ssoService.getAvailableProviders();
    
    // Auto-select first provider if available
    if (availableProviders.value.length > 0) {
      selectedProvider.value = availableProviders.value[0].provider;
    }
    
    console.log('📄 [SSOSettings] Available providers loaded:', availableProviders.value);
    
  } catch (error) {
    console.error('Error loading available providers:', error);
    errorMessage.value = 'Failed to load available providers';
  } finally {
    loadingProviders.value = false;
  }
}

async function loadProviderConfig() {
  if (!selectedProvider.value) return;
  
  loading.value = true;
  errorMessage.value = '';
  
  try {
    // Load configuration data for selected provider
    configData.value = await ssoService.getConfig(selectedProvider.value);
    
    // Populate form with configuration data if available
    if (configData.value) {
      form.clientId = configData.value.clientId || '';
      form.clientSecret = configData.value.clientSecret || '';
    } else {
      // If no configuration, ensure form is clean
      resetForm();
    }
    
    console.log('📄 [SSOSettings] Config loaded for provider:', {
      provider: selectedProvider.value,
      hasConfig: !!configData.value,
      enabled: configData.value?.enabled,
      clientId: configData.value?.clientId
    });
    
  } catch (error) {
    console.error('Error loading SSO config:', error);
    // Don't show error for missing config - it's normal for unconfigured providers
    configData.value = null;
    resetForm();
  } finally {
    loading.value = false;
  }
}

function onProviderChange() {
  clearMessages();
  clearErrors();
  // Config will be loaded by the watcher
}

function resetForm() {
  form.clientId = '';
  form.clientSecret = '';
  clearErrors();
  clearMessages();
}

function clearErrors() {
  Object.keys(errors).forEach(key => {
    delete errors[key as keyof typeof errors];
  });
}

function clearMessages() {
  successMessage.value = '';
  errorMessage.value = '';
}

function validateForm(): boolean {
  clearErrors();
  let isValid = true;

  if (!form.clientId.trim()) {
    errors.clientId = 'Client ID is required';
    isValid = false;
  } else if (form.clientId.length < 8) {
    errors.clientId = 'Client ID must be at least 8 characters';
    isValid = false;
  }

  if (!form.clientSecret.trim()) {
    errors.clientSecret = 'Client Secret is required';
    isValid = false;
  } else if (form.clientSecret.length < 16) {
    errors.clientSecret = 'Client Secret must be at least 16 characters';
    isValid = false;
  }

  return isValid;
}

async function handleSubmit() {
  clearMessages();
  
  if (!validateForm() || !selectedProvider.value) {
    return;
  }

  saving.value = true;

  try {
    const requestData = {
      clientId: form.clientId.trim(),
      clientSecret: form.clientSecret.trim()
    };

    // Use single saveConfig method that handles both create and update
    await ssoService.saveConfig(selectedProvider.value, requestData);
    successMessage.value = configData.value 
      ? 'Configuration updated successfully'
      : 'Configuration saved successfully';

    // Reload config data and update form
    setTimeout(async () => {
      try {
        configData.value = await ssoService.getConfig(selectedProvider.value);
        
        // Update form with fresh data from backend
        if (configData.value) {
          form.clientId = configData.value.clientId || '';
          form.clientSecret = configData.value.clientSecret || '';
        }
      } catch (error) {
        console.error('Error reloading config:', error);
      }
    }, 1000);
    
  } catch (error: any) {
    console.error('Error saving SSO config:', error);
    
    if (error.response?.data?.errors) {
      const backendErrors = error.response.data.errors;
      backendErrors.forEach((err: any) => {
        if (err.field && err.message) {
          errors[err.field as keyof typeof errors] = err.message;
        }
      });
    } else {
      errorMessage.value = error.message || 'Failed to save configuration';
    }
  } finally {
    saving.value = false;
  }
}

async function toggleConfiguration() {
  if (!configData.value || !selectedProvider.value) {
    return;
  }

  const action = configData.value.enabled ? 'disable' : 'enable';
  const newEnabled = !configData.value.enabled;
  const providerName = availableProviders.value.find(p => p.provider === selectedProvider.value)?.displayName || selectedProvider.value;

  if (!confirm(`Are you sure you want to ${action} the ${providerName} configuration?`)) {
    return;
  }

  clearMessages();
  saving.value = true;

  try {
    await ssoService.toggleConfig(selectedProvider.value, newEnabled);
    successMessage.value = `Configuration ${action}d successfully`;
    
    // Update local state immediately for better UX
    configData.value.enabled = newEnabled;
    
  } catch (error: any) {
    console.error('Error toggling SSO config:', error);
    errorMessage.value = error.message || `Failed to ${action} configuration`;
  } finally {
    saving.value = false;
  }
}

async function deleteConfiguration() {
  if (!selectedProvider.value) return;
  
  const providerName = availableProviders.value.find(p => p.provider === selectedProvider.value)?.displayName || selectedProvider.value;
  
  if (!confirm(`Are you sure you want to delete the ${providerName} configuration?`)) {
    return;
  }

  clearMessages();
  saving.value = true;

  try {
    await ssoService.deleteConfig(selectedProvider.value);
    successMessage.value = 'Configuration deleted successfully';
    resetForm(); // Clear form when deleting
    await loadProviderConfig(); // Reload to refresh state
  } catch (error: any) {
    console.error('Error deleting SSO config:', error);
    errorMessage.value = error.message || 'Failed to delete configuration';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.of-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--of-spacing-sm);
  color: var(--text-color);
  font-weight: 500;
}

.status-indicator {
  margin-left: auto;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-enabled {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-disabled {
  background-color: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.of-card-content {
  padding: var(--of-spacing-lg);
}

.of-form-container {
  /* Remove top margin since we removed status section */
}

.of-form {
  max-width: 600px; /* Limit form width for better readability */
}

.of-form-group {
  margin-bottom: var(--of-spacing-lg);
}

.of-form-label {
  display: block;
  margin-bottom: var(--of-spacing-sm);
  font-weight: 500;
  color: var(--text-color);
}

/* Wide form fields for better UX */
.of-form-field-wide {
  width: 100% !important;
  min-width: 400px;
}

/* Override PrimeVue input styles for consistency */
:deep(.p-inputtext),
:deep(.p-password-input),
:deep(.p-dropdown) {
  width: 100% !important;
  min-width: 400px;
  padding: 12px 16px;
  font-size: 14px;
}

:deep(.p-password) {
  width: 100% !important;
  min-width: 400px;
}

.of-form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--of-spacing-xl);
  padding-top: var(--of-spacing-lg);
  border-top: 1px solid var(--surface-border);
}

.of-form-actions-left {
  flex: 1;
  display: flex;
  gap: var(--of-spacing-sm);
}

.mr-2 {
  margin-right: var(--of-spacing-sm);
}

.of-form-actions-right {
  display: flex;
  gap: var(--of-spacing-sm);
}

.of-message {
  display: flex;
  align-items: center;
  gap: var(--of-spacing-sm);
  padding: var(--of-spacing-md);
  border-radius: var(--of-card-radius);
  margin-top: var(--of-spacing-lg);
  font-size: var(--of-font-size-sm);
}

.of-message-success {
  background-color: rgba(102, 187, 106, 0.1);
  color: var(--of-success);
  border: 1px solid rgba(102, 187, 106, 0.3);
}

.of-message-error {
  background-color: rgba(239, 83, 80, 0.1);
  color: var(--of-danger);
  border: 1px solid rgba(239, 83, 80, 0.3);
}

.of-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--of-spacing-xl);
  gap: var(--of-spacing-md);
}

.of-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--surface-border);
  border-top: 3px solid var(--of-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media screen and (max-width: 768px) {
  .of-form {
    max-width: 100%;
  }
  
  .of-form-field-wide,
  :deep(.p-inputtext),
  :deep(.p-password-input),
  :deep(.p-dropdown),
  :deep(.p-password) {
    min-width: 100% !important;
    width: 100% !important;
  }
  
  .of-form-actions {
    flex-direction: column;
    gap: var(--of-spacing-md);
    align-items: stretch;
  }
  
  .of-form-actions-right {
    width: 100%;
    justify-content: stretch;
  }
  
  .of-form-actions-right .of-button {
    flex: 1;
  }
}
</style> 