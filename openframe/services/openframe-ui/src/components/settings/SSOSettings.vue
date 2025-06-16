<template>
  <div class="of-card">
    <div class="of-card-header">
      <i class="pi pi-key"></i>
      <span>Single Sign-On Configuration</span>
    </div>

    <div v-if="loading" class="of-loading">
      <div class="of-spinner"></div>
      <span class="of-text-secondary">Loading configuration...</span>
    </div>

    <div v-else class="of-card-content">
      <!-- Configuration Form -->
      <div class="of-form-container">
        <form @submit.prevent="handleSubmit" class="of-form">
          <!-- Provider Selection - Fixed to Google only -->
          <div class="of-form-group">
            <label class="of-form-label">OAuth Provider</label>
            <OFDropdown
              v-model="selectedProvider"
              :options="providerOptions"
              optionLabel="label"
              optionValue="value"
              :disabled="true"
              placeholder="Google OAuth"
              class="of-form-field-wide"
            />
          </div>

          <div class="of-form-group">
            <label for="clientId" class="of-form-label">Client ID *</label>
            <InputText
              id="clientId"
              v-model="form.clientId"
              type="text"
              required
              placeholder="Enter Google OAuth Client ID"
              :class="{ 'p-invalid': errors.clientId, 'of-form-field-wide': true }"
            />
            <small v-if="errors.clientId" class="p-error">{{ errors.clientId }}</small>
          </div>

          <div class="of-form-group">
            <label for="clientSecret" class="of-form-label">Client Secret *</label>
            <Password
              id="clientSecret"
              v-model="form.clientSecret"
              :feedback="false"
              toggleMask
              required
              placeholder="Enter Google OAuth Client Secret"
              :class="{ 'p-invalid': errors.clientSecret, 'of-form-field-wide': true }"
            />
            <small v-if="errors.clientSecret" class="p-error">{{ errors.clientSecret }}</small>
          </div>

          <!-- Form Actions -->
          <div class="of-form-actions">
            <div class="of-form-actions-left">
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
import { ref, reactive, onMounted } from 'vue';
import { ssoService } from '@/services/SSOService';
import type { SSOConfigResponse, SSOConfigRequest } from '@/types/sso';
import { OFButton, OFDropdown } from '@/components/ui';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

const selectedProvider = ref<string>('google');
const loading = ref(false);
const saving = ref(false);
const configData = ref<SSOConfigResponse | null>(null);
const successMessage = ref('');
const errorMessage = ref('');

// Fixed to Google only
const providerOptions = [
  { value: 'google', label: 'Google OAuth' }
];

const form = reactive({
  clientId: '',
  clientSecret: ''
});

const errors = reactive<{ clientId?: string; clientSecret?: string }>({});

onMounted(() => {
  loadProviderConfig();
});

async function loadProviderConfig() {
  loading.value = true;
  errorMessage.value = '';
  
  try {
    // Load only configuration data - status can be derived from config
    configData.value = await ssoService.getConfig(selectedProvider.value);
    
    // Populate form with configuration data if available
    if (configData.value) {
      form.clientId = configData.value.clientId || '';
      // Populate client secret for editing (it's now returned from backend)
      form.clientSecret = configData.value.clientSecret || '';
    } else {
      // If no configuration, ensure form is clean
      resetForm();
    }
    
    console.log('📄 [SSOSettings] Config loaded:', {
      hasConfig: !!configData.value,
      configured: !!configData.value,
      enabled: configData.value?.enabled,
      clientId: configData.value?.clientId,
      formClientId: form.clientId
    });
    
  } catch (error) {
    console.error('Error loading SSO config:', error);
    errorMessage.value = 'Failed to load configuration';
  } finally {
    loading.value = false;
  }
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
  
  if (!validateForm()) {
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

    // Only clear the client secret for security, keep client ID
    form.clientSecret = '';
    
    // Reload config data
    setTimeout(async () => {
      try {
        configData.value = await ssoService.getConfig(selectedProvider.value);
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

async function deleteConfiguration() {
  if (!confirm(`Are you sure you want to delete the Google OAuth configuration?`)) {
    return;
  }

  clearMessages();
  saving.value = true;

  try {
    await ssoService.deleteConfig(selectedProvider.value);
    successMessage.value = 'Configuration deleted successfully';
    resetForm(); // Clear form when deleting
    await loadProviderConfig();
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
  gap: var(--of-spacing-sm);
  color: var(--of-primary);
  font-weight: 500;
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