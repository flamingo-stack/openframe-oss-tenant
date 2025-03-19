<template>
  <div class="rmm-settings">
    <div v-if="error" class="error-message">
      <i class="pi pi-exclamation-triangle" style="font-size: 1.25rem"></i>
      <span v-html="error"></span>
    </div>

    <div v-else-if="loading" class="loading-spinner">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <span>Loading configuration...</span>
    </div>

    <div v-else class="settings-layout">
      <div class="settings-categories">
        <ul class="category-menu">
          <router-link 
            v-for="category in categories" 
            :key="category.key"
            :to="{ name: 'rmm-settings-category', params: { category: category.key }}"
            custom
            v-slot="{ isActive, navigate }"
          >
            <li 
              :class="{ active: isActive }"
              @click="navigate"
            >
              <i :class="category.icon"></i>
              <span>{{ category.label }}</span>
            </li>
          </router-link>
        </ul>
      </div>

      <router-view
        :settings="settings"
        :saveSettings="saveSettings"
        :fetchSettings="fetchSettings"
        :hasChanges="hasChanges"
        :changedValues="changedValues"
        :formatKey="(key: string) => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')"
        :hasPropertyChanges="(category: string) => Object.keys(changedValues).some(key => key.startsWith(category))"
        :isSaving="(category: string) => saving"
        :saveConfigProperty="saveConfigProperty"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { computed, onMounted, watch } from '@vue/runtime-core';
import type { ComputedRef, WatchSource } from '@vue/runtime-core';
import { useRoute, useRouter } from 'vue-router';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
import { ToastService } from '../../services/ToastService';
import type { RMMSettings, DynamicSettings, ApiKey, UrlAction, KeyStore, CustomField } from '../../types/settings';
import type { ExtendedRMMSettings } from '../../types/rmm';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Password from 'primevue/password';
import Chips from 'primevue/chips';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Textarea from 'primevue/textarea';
import InputMask from 'primevue/inputmask';
import { useToast } from 'primevue/usetoast';
import { useSettingsStore } from '../../stores/settings';
import { useUserStore } from '../../stores/user';
import { useAuthStore } from '../../stores/auth';
import { useErrorStore } from '../../stores/error';
import { useLoadingStore } from '../../stores/loading';
import { useToastStore } from '../../stores/toast';
import { useSettings } from '../../composables/useSettings';
import { useSettingsSave } from '../../composables/useSettingsSave';
import SettingsCategory from './SettingsCategory.vue';

const configService = ConfigService.getInstance();
const config = configService.getConfig();
const VITE_API_URL = `${config.gatewayUrl}/tools/tactical-rmm/core`;
const toastService = ToastService.getInstance();

const route = useRoute();
const router = useRouter();
const toast = useToast();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const errorStore = useErrorStore();
const loadingStore = useLoadingStore();
const toastStore = useToastStore();
const { fetchConfig } = useSettings();

const { 
  saveConfigProperty, 
  updateChangedValue, 
  clearChangedValues, 
  isSaving, 
  changedValues, 
  hasChanges 
} = useSettingsSave({
  apiUrl: `${VITE_API_URL}/settings/`,
  onSuccess: () => {
    // Refresh settings after successful save
    fetchConfig();
  }
});

interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
  endpoint?: string;
}

type ExtendedRMMSettingsWithDefaults = ExtendedRMMSettings & {
  id: number;
  created_by: string;
  created_time: string;
  modified_by: string;
  modified_time: string;
  twilio_to_number: string;
  twilio_alert_recipients: string[];
  sso_enabled: boolean;
  workstation_policy: string;
  server_policy: string;
  alert_template: string;
  agent_auto_update_enabled: boolean;
  agent_auto_update_policy: string;
  agent_auto_update_schedule: string;
  agent_auto_update_grace_period: number;
};

const loading = ref<boolean>(true);
const saving = ref<boolean>(false);
const error = ref<string>('');
const settings = ref<ExtendedRMMSettingsWithDefaults | null>(null);
const originalSettings = ref<ExtendedRMMSettingsWithDefaults | null>(null);
const currentCategory = ref<string>('general');

const categories = computed(() => [
  { key: 'general', icon: 'pi pi-cog', label: 'General' },
  { key: 'alerts', icon: 'pi pi-bell', label: 'Alerts' },
  { key: 'custom_fields', icon: 'pi pi-list', label: 'Custom Fields' },
  { key: 'key_store', icon: 'pi pi-key', label: 'Key Store' },
  { key: 'url_actions', icon: 'pi pi-link', label: 'URL Actions' },
  { key: 'api_keys', icon: 'pi pi-lock', label: 'API Keys' }
]);

const navigateToCategory = (category: string) => {
  currentCategory.value = category;
  router.push({ 
    name: 'rmm-settings-category', 
    params: { category }
  });
};

const fetchCategoryData = async (category: string) => {
  // All settings are now handled through the main settings object
  return null;
};

const fetchSettings = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await restClient.get<ExtendedRMMSettings>(`${VITE_API_URL}/settings/`);
    // Initialize org_info if it doesn't exist
    const extendedSettings: ExtendedRMMSettingsWithDefaults = {
      ...response,
      id: response.id || 0,
      created_by: response.created_by || '',
      created_time: response.created_time || '',
      modified_by: response.modified_by || '',
      modified_time: response.modified_time || '',
      twilio_to_number: response.twilio_to_number || '',
      twilio_alert_recipients: response.twilio_alert_recipients || [],
      org_info: response.org_info || {
        org_name: '',
        org_logo_url: null,
        org_logo_url_dark: null,
        org_logo_url_light: null
      },
      sso_enabled: response.sso_enabled || false,
      workstation_policy: response.workstation_policy || '',
      server_policy: response.server_policy || '',
      alert_template: response.alert_template || '',
      agent_auto_update_enabled: response.agent_auto_update_enabled || false,
      agent_auto_update_policy: response.agent_auto_update_policy || '',
      agent_auto_update_schedule: response.agent_auto_update_schedule || '',
      agent_auto_update_grace_period: response.agent_auto_update_grace_period || 0
    };
    settings.value = extendedSettings;
    originalSettings.value = JSON.parse(JSON.stringify(extendedSettings));

    const currentCategory = route.params.category as string;
    if (currentCategory) {
      const categoryData = await fetchCategoryData(currentCategory);
      if (categoryData && settings.value) {
        settings.value = {
          ...settings.value,
          [currentCategory]: categoryData,
          id: settings.value.id,
          created_by: settings.value.created_by,
          created_time: settings.value.created_time,
          modified_by: settings.value.modified_by,
          modified_time: settings.value.modified_time,
          twilio_to_number: settings.value.twilio_to_number,
          twilio_alert_recipients: settings.value.twilio_alert_recipients,
          sso_enabled: settings.value.sso_enabled,
          workstation_policy: settings.value.workstation_policy,
          server_policy: settings.value.server_policy,
          alert_template: settings.value.alert_template,
          agent_auto_update_enabled: settings.value.agent_auto_update_enabled,
          agent_auto_update_policy: settings.value.agent_auto_update_policy,
          agent_auto_update_schedule: settings.value.agent_auto_update_schedule,
          agent_auto_update_grace_period: settings.value.agent_auto_update_grace_period
        };
      }
    }
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    const message = err.response?.message || err.message || 'Failed to fetch settings';
    error.value = message;
    toastService.showError(message);
  } finally {
    loading.value = false;
  }
};

const saveAndTestEmail = async () => {
  // TODO: Implement email test functionality
};

const resetPatchPolicy = async () => {
  try {
    await restClient.post(`${config.gatewayUrl}/tools/tactical-rmm/core/reset-patch-policy/`);
    toastStore.showSuccess('Patch policy reset successfully');
  } catch (err: any) {
    console.error('Error resetting patch policy:', err);
    const message = err.response?.data?.message || err.message || 'Failed to reset patch policy';
    toastStore.showError(message);
  }
};

const showNewApiKeyDialog = ref(false);
const generatingApiKey = ref(false);
const newApiKey = ref({
  name: '',
  expiration: null as Date | null
});

const copyApiKey = (key: string) => {
  navigator.clipboard.writeText(key);
  toastStore.showSuccess('API key copied to clipboard');
};

const deleteApiKey = async (id: number) => {
  try {
    await restClient.delete(`${config.gatewayUrl}/tools/tactical-rmm/accounts/apikeys/${id}/`);
    if (settings.value?.api_keys) {
      settings.value.api_keys = settings.value.api_keys.filter((k: ApiKey) => k.id !== id);
    }
    toastStore.showSuccess('API key deleted successfully');
  } catch (err: any) {
    console.error('Error deleting API key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete API key';
    toastStore.showError(message);
  }
};

const generateApiKey = async () => {
  if (!newApiKey.value.name) {
    toastStore.showError('Please enter a name for the API key');
    return;
  }

  generatingApiKey.value = true;
  try {
    const response = await restClient.post<ApiKey>(`${config.gatewayUrl}/tools/tactical-rmm/accounts/apikeys/`, {
      name: newApiKey.value.name,
      expiration: newApiKey.value.expiration?.toISOString() || null
    });
    
    if (!settings.value) {
      settings.value = {} as ExtendedRMMSettingsWithDefaults;
    }
    if (!settings.value.api_keys) {
      settings.value.api_keys = [];
    }
    settings.value.api_keys.push(response);
    
    showNewApiKeyDialog.value = false;
    newApiKey.value = { name: '', expiration: null };
    toastStore.showSuccess('API key generated successfully');
  } catch (err: any) {
    console.error('Error generating API key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to generate API key';
    toastStore.showError(message);
  } finally {
    generatingApiKey.value = false;
  }
};

const showUrlActionDialog = ref(false);
const editingUrlAction = ref<UrlAction | null>(null);
const savingUrlAction = ref(false);
const urlActionForm = ref({
  name: '',
  desc: '',
  pattern: '',
  action_type: 'rest' as 'rest' | 'web',
  rest_method: 'get',
  rest_body: '',
  rest_headers: ''
});

const allUrlActions = computed(() => {
  if (!settings.value) return [];
  const urlActions = settings.value.url_actions || [];
  const webhooks = settings.value.webhooks || [];
  return [...urlActions, ...webhooks];
});

const editUrlAction = (action: UrlAction) => {
  editingUrlAction.value = action;
  urlActionForm.value = {
    name: action.name,
    desc: action.desc,
    pattern: action.pattern,
    action_type: action.action_type,
    rest_method: action.rest_method,
    rest_body: action.rest_body,
    rest_headers: action.rest_headers
  };
  showUrlActionDialog.value = true;
};

const deleteUrlAction = async (id: number) => {
  try {
    const endpoint = '/core/urlaction/';
    await restClient.delete(`${VITE_API_URL}${endpoint}${id}/`);
    
    if (!settings.value) return;
    
    settings.value.url_actions = settings.value.url_actions?.filter((a: UrlAction) => a.id !== id);
    settings.value.webhooks = settings.value.webhooks?.filter((w: UrlAction) => w.id !== id);
    
    toastService.showSuccess('URL Action deleted successfully');
  } catch (err: any) {
    console.error('Error deleting:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete';
    toastService.showError(message);
  }
};

const saveUrlAction = async () => {
  if (!urlActionForm.value.name || !urlActionForm.value.pattern) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingUrlAction.value = true;
  try {
    const endpoint = '/core/urlaction/';
    const method = editingUrlAction.value ? 'patch' : 'post';
    const url = editingUrlAction.value 
      ? `${VITE_API_URL}${endpoint}${editingUrlAction.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

    const response = await restClient[method]<UrlAction>(url, urlActionForm.value);
    
    if (!settings.value) return;

    if (editingUrlAction.value) {
      const index = allUrlActions.value.findIndex((a: UrlAction) => a.id === editingUrlAction.value?.id);
      if (index !== -1) {
        if (response.action_type === 'web') {
          settings.value.webhooks = settings.value.webhooks?.map((w: UrlAction) => 
            w.id === response.id ? response : w
          );
        } else {
          settings.value.url_actions = settings.value.url_actions?.map((a: UrlAction) => 
            a.id === response.id ? response : a
          );
        }
      }
    } else {
      if (response.action_type === 'web') {
        if (!settings.value.webhooks) settings.value.webhooks = [];
        settings.value.webhooks.push(response);
      } else {
        if (!settings.value.url_actions) settings.value.url_actions = [];
        settings.value.url_actions.push(response);
      }
    }
    
    closeUrlActionDialog();
    toastService.showSuccess('URL Action saved successfully');
  } catch (err: any) {
    console.error('Error saving:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save';
    toastService.showError(message);
  } finally {
    savingUrlAction.value = false;
  }
};

const closeUrlActionDialog = () => {
  showUrlActionDialog.value = false;
  editingUrlAction.value = null;
  urlActionForm.value = {
    name: '',
    desc: '',
    pattern: '',
    action_type: 'rest',
    rest_method: 'get',
    rest_body: '',
    rest_headers: ''
  };
};

const copyKeyStore = (value: string) => {
  navigator.clipboard.writeText(value);
  toastService.showSuccess('Key value copied to clipboard');
};

const showRecipientDialog = ref(false);
const editingRecipientIndex = ref<number | null>(null);
const savingRecipient = ref(false);
const recipientForm = ref({
  phone: ''
});

const editRecipient = (index: number) => {
  if (!settings.value?.sms_alert_recipients) return;
  editingRecipientIndex.value = index;
  recipientForm.value = {
    phone: settings.value.sms_alert_recipients[index]
  };
  showRecipientDialog.value = true;
};

const saveRecipient = async () => {
  if (!recipientForm.value.phone) {
    toastService.showError('Please enter a phone number');
    return;
  }

  savingRecipient.value = true;
  try {
    if (!settings.value) return;

    if (!settings.value.sms_alert_recipients) {
      settings.value.sms_alert_recipients = [];
    }

    if (editingRecipientIndex.value !== null) {
      settings.value.sms_alert_recipients[editingRecipientIndex.value] = recipientForm.value.phone;
    } else {
      settings.value.sms_alert_recipients.push(recipientForm.value.phone);
    }

    closeRecipientDialog();
    toastService.showSuccess('Recipient saved successfully');
  } catch (err: any) {
    console.error('Error saving recipient:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save recipient';
    toastService.showError(message);
  } finally {
    savingRecipient.value = false;
  }
};

const closeRecipientDialog = () => {
  showRecipientDialog.value = false;
  editingRecipientIndex.value = null;
  recipientForm.value = {
    phone: ''
  };
};

// Key Store functions
const showKeyStoreDialog = ref(false);
const savingKeyStore = ref(false);
const editingKeyStore = ref<KeyStore | null>(null);
const keyStoreForm = ref({
  name: '',
  value: ''
});

const editKeyStore = (key: KeyStore) => {
  editingKeyStore.value = key;
  keyStoreForm.value = {
    name: key.name,
    value: key.value
  };
  showKeyStoreDialog.value = true;
};

const saveKeyStore = async () => {
  if (!keyStoreForm.value.name || !keyStoreForm.value.value) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingKeyStore.value = true;
  try {
    const endpoint = '/core/keystore/';
    const method = editingKeyStore.value ? 'patch' : 'post';
    const url = editingKeyStore.value 
      ? `${VITE_API_URL}${endpoint}${editingKeyStore.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

    const response = await restClient[method]<KeyStore>(url, keyStoreForm.value);
    
    if (!settings.value) return;
    
    if (editingKeyStore.value) {
      settings.value.key_store = settings.value.key_store?.map((k: KeyStore) => 
        k.id === response.id ? response : k
      );
    } else {
      if (!settings.value.key_store) settings.value.key_store = [];
      settings.value.key_store.push(response);
    }
    
    showKeyStoreDialog.value = false;
    toastService.showSuccess('Key saved successfully');
  } catch (err: any) {
    console.error('Error saving key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save key';
    toastService.showError(message);
  } finally {
    savingKeyStore.value = false;
  }
};

const deleteKeyStore = async (id: number) => {
  try {
    await restClient.delete(`${VITE_API_URL}/core/keystore/${id}/`);
    if (!settings.value) return;
    settings.value.key_store = settings.value.key_store?.filter((k: KeyStore) => k.id !== id);
    toastService.showSuccess('Key deleted successfully');
  } catch (err: any) {
    console.error('Error deleting key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete key';
    toastService.showError(message);
  }
};

// Custom Fields functions
const showCustomFieldDialog = ref(false);
const savingCustomField = ref(false);
const editingCustomField = ref<CustomField | null>(null);
const customFieldForm = ref({
  name: '',
  model: '',
  type: '',
  required: false,
  options: '',
  default_value_string: '',
  default_value_bool: false,
  default_values_multiple: [] as string[],
  hide_in_ui: false,
  hide_in_summary: false
});

const editCustomField = (field: CustomField) => {
  editingCustomField.value = field;
  customFieldForm.value = {
    name: field.name,
    model: field.model,
    type: field.type,
    required: field.required,
    options: field.options.join(', '),
    default_value_string: field.default_value_string,
    default_value_bool: field.default_value_bool,
    default_values_multiple: field.default_values_multiple,
    hide_in_ui: field.hide_in_ui,
    hide_in_summary: field.hide_in_summary
  };
  showCustomFieldDialog.value = true;
};

const saveCustomField = async () => {
  if (!customFieldForm.value.name || !customFieldForm.value.model || !customFieldForm.value.type) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingCustomField.value = true;
  try {
    const endpoint = '/core/customfields/';
    const method = editingCustomField.value ? 'patch' : 'post';
    const url = editingCustomField.value 
      ? `${VITE_API_URL}${endpoint}${editingCustomField.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

    const formData = {
      name: customFieldForm.value.name,
      model: customFieldForm.value.model,
      type: customFieldForm.value.type,
      required: customFieldForm.value.required,
      options: customFieldForm.value.options.split(',').map(opt => opt.trim()).filter(Boolean),
      default_value_string: customFieldForm.value.default_value_string,
      default_value_bool: customFieldForm.value.default_value_bool,
      default_values_multiple: customFieldForm.value.default_values_multiple,
      hide_in_ui: customFieldForm.value.hide_in_ui,
      hide_in_summary: customFieldForm.value.hide_in_summary
    };

    const response = await restClient[method]<CustomField>(url, formData);
    
    if (!settings.value) return;
    
    if (editingCustomField.value) {
      settings.value.custom_fields = settings.value.custom_fields?.map((f: CustomField) => 
        f.id === response.id ? response : f
      );
    } else {
      if (!settings.value.custom_fields) settings.value.custom_fields = [];
      settings.value.custom_fields.push(response);
    }
    
    showCustomFieldDialog.value = false;
    toastService.showSuccess('Custom field saved successfully');
  } catch (err: any) {
    console.error('Error saving custom field:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save custom field';
    toastService.showError(message);
  } finally {
    savingCustomField.value = false;
  }
};

const deleteCustomField = async (id: number) => {
  try {
    await restClient.delete(`${VITE_API_URL}/core/customfields/${id}/`);
    if (!settings.value) return;
    settings.value.custom_fields = settings.value.custom_fields?.filter((f: CustomField) => f.id !== id);
    toastService.showSuccess('Custom field deleted successfully');
  } catch (err: any) {
    console.error('Error deleting custom field:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete custom field';
    toastService.showError(message);
  }
};

const removeRecipient = (index: number) => {
  if (!settings.value?.sms_alert_recipients) return;
  settings.value.sms_alert_recipients.splice(index, 1);
  toastService.showSuccess('Recipient removed successfully');
};

const saveSettings = async () => {
  saving.value = true;
  error.value = '';
  try {
    if (!settings.value) {
      throw new Error('Settings not initialized');
    }
    const response = await restClient.patch<ExtendedRMMSettings>(`${VITE_API_URL}/settings/`, changedValues.value);
    const extendedResponse: ExtendedRMMSettingsWithDefaults = {
      ...response,
      id: response.id || 0,
      created_by: response.created_by || '',
      created_time: response.created_time || '',
      modified_by: response.modified_by || '',
      modified_time: response.modified_time || '',
      twilio_to_number: response.twilio_to_number || '',
      twilio_alert_recipients: response.twilio_alert_recipients || [],
      org_info: response.org_info || {
        org_name: '',
        org_logo_url: null,
        org_logo_url_dark: null,
        org_logo_url_light: null
      },
      sso_enabled: response.sso_enabled || false,
      workstation_policy: response.workstation_policy || '',
      server_policy: response.server_policy || '',
      alert_template: response.alert_template || '',
      agent_auto_update_enabled: response.agent_auto_update_enabled || false,
      agent_auto_update_policy: response.agent_auto_update_policy || '',
      agent_auto_update_schedule: response.agent_auto_update_schedule || '',
      agent_auto_update_grace_period: response.agent_auto_update_grace_period || 0
    };
    settings.value = extendedResponse;
    originalSettings.value = JSON.parse(JSON.stringify(extendedResponse));
    changedValues.value = {};
    hasChanges.value = false;
    toastStore.showSuccess('Settings saved successfully');
  } catch (err: any) {
    console.error('Error saving settings:', err);
    const message = err.response?.message || err.message || 'Failed to save settings';
    error.value = message;
    toastStore.showError(message);
  } finally {
    saving.value = false;
  }
};

// Fix TypeScript errors in watch functions
watch(() => route.params.category, (value: string | string[]) => {
  if (typeof value === 'string' && categories.value.some((c: { key: string; icon: string; label: string }) => c.key === value)) {
    currentCategory.value = value;
  }
});

watch(() => settings.value, (newSettings: ExtendedRMMSettingsWithDefaults | null) => {
  if (newSettings) {
    originalSettings.value = JSON.parse(JSON.stringify(newSettings));
  }
}, { deep: true });

onMounted(async () => {
  await fetchSettings();
  
  if (!route.params.category && categories.value.length > 0) {
    router.push({ 
      name: 'rmm-settings-category', 
      params: { category: categories.value[0].key }
    });
  }
});

// Fix TypeScript errors in formatKey function
const formatKey = (k: string): string => {
  return k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Fix TypeScript errors in handleSaveAll function
const handleSaveAll = async () => {
  saving.value = true;
  error.value = '';

  try {
    // Save all changed values
    for (const [key, value] of Object.entries(changedValues.value)) {
      const [mainKey, subKey] = key.split('.');
      await handleSaveConfigProperty(mainKey as keyof ExtendedRMMSettings, subKey || null);
    }

    // Clear changed values
    changedValues.value = {};
    hasChanges.value = false;

    toastStore.showSuccess('All settings saved successfully');
  } catch (err) {
    console.error('Error saving all settings:', err);
    error.value = err instanceof Error ? err.message : 'Failed to save settings';
    toastStore.showError(error.value);
  } finally {
    saving.value = false;
  }
};

// Fix TypeScript errors in methods
const handleCategoryClick = (category: { key: string; icon: string; label: string }) => {
  router.push(`/rmm/settings/${category.key}`);
};

// Update the saveConfigProperty call to include the value
const handleSaveConfigProperty = async (key: keyof ExtendedRMMSettings, subKey: string | null) => {
  if (!settings.value) return;
  
  const value = subKey 
    ? (settings.value[key] as Record<string, unknown>)?.[subKey] 
    : settings.value[key];
    
  if (value === undefined) return;
  
  await saveConfigProperty(String(key), subKey, value);
};
</script>

<style scoped>
.rmm-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-layout {
  display: flex;
  gap: 2rem;
  flex: 1;
  min-height: 0;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1rem;
  box-shadow: var(--card-shadow);
}

.settings-categories {
  flex: 0 0 220px;
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 0.5rem;
  overflow-y: auto;
}

.category-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-menu li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-color);
}

.category-menu li:hover {
  background: var(--surface-hover);
}

.category-menu li.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.category-menu li i {
  font-size: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--red-100);
  color: var(--red-700);
  border-radius: 8px;
  margin-bottom: 1rem;
  width: 100%;
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  width: 100%;
}

.grid {
  margin: 0;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
}

.col-12 {
  width: 100%;
}

@media screen and (min-width: 768px) {
  .md\:col-12 {
    width: 100%;
  }
}

@media screen and (min-width: 1200px) {
  .xl\:col-6 {
    width: 50%;
  }
}
</style>
