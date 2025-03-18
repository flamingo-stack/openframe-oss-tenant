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
        :formatKey="formatKey"
        :hasPropertyChanges="hasPropertyChanges"
        :isSaving="isSaving"
        :saveConfigProperty="saveConfigProperty"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm/core`;
const toastService = ToastService.getInstance();

const route = useRoute();
const router = useRouter();

interface Settings {
  agent_port?: number;
  check_interval?: number;
  agent_debug_level: string;
  debug_log_prune_days: number;
  agent_history_prune_days: number;
  check_history_prune_days: number;
  resolved_alerts_prune_days: number;
  audit_log_prune_days: number;
  clear_faults_days: number;
  agent_auto_update: boolean;
  smtp_from_email: string;
  smtp_from_name: string | null;
  smtp_host: string;
  smtp_host_user: string;
  smtp_host_password: string;
  smtp_port: number;
  smtp_requires_auth: boolean;
  email_alert_recipients: string[];
  notify_on_warning_alerts: boolean;
  notify_on_info_alerts: boolean;
  default_time_zone: string;
  all_timezones: string[];
}

interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
  endpoint?: string;
}

interface DynamicSettings extends Settings {
  [key: string]: any;
}

const loading = ref(true);
const saving = ref(false);
const error = ref<string>('');
const settings = ref<DynamicSettings>({} as DynamicSettings);
const originalSettings = ref<DynamicSettings | null>(null);
const savingProperties = ref(new Set<string>());

const categories = computed((): CategoryConfig[] => [
  { key: 'general', label: 'General', icon: 'pi pi-cog' },
  { key: 'email', label: 'Email Alerts', icon: 'pi pi-envelope' },
  { key: 'sms', label: 'SMS Alerts', icon: 'pi pi-mobile' },
  { key: 'mesh', label: 'MeshCentral', icon: 'pi pi-server' },
  { key: 'custom_fields', label: 'Custom Fields', icon: 'pi pi-list', endpoint: '/core/customfields/' },
  { key: 'key_store', label: 'Key Store', icon: 'pi pi-key', endpoint: '/core/keystore/' },
  { key: 'url_actions', label: 'URL Actions', icon: 'pi pi-link', endpoint: '/core/urlaction/' },
  { key: 'webhooks', label: 'Web Hooks', icon: 'pi pi-rss', endpoint: '/core/webhook/' },
  { key: 'retention', label: 'Retention', icon: 'pi pi-trash' },
  { key: 'api_keys', label: 'API Keys', icon: 'pi pi-key', endpoint: '/accounts/apikeys/' },
  { key: 'sso', label: 'Single Sign-On (SSO)', icon: 'pi pi-sign-in', endpoint: '/accounts/ssoproviders/' }
]);

const formatKey = (key: string): string => {
  return key
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const hasPropertyChanges = (category: string): boolean => {
  if (!originalSettings.value) return false;
  
  const currentValue = settings.value[category as keyof Settings];
  const originalValue = originalSettings.value[category as keyof Settings];
  
  return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
};

const isSaving = (category: string): boolean => {
  return savingProperties.value.has(category);
};

const fetchCategoryData = async (category: string) => {
  const categoryConfig = categories.value.find(c => c.key === category);
  if (!categoryConfig?.endpoint) {
    return null; // This category uses the main settings endpoint
  }

  try {
    // Remove /core/ from the API URL for non-core endpoints
    const baseUrl = categoryConfig.endpoint.startsWith('/accounts/') 
      ? `${envConfig.GATEWAY_URL}/tools/tactical-rmm`
      : `${envConfig.GATEWAY_URL}/tools/tactical-rmm/core`;
      
    const response = await restClient.get(`${baseUrl}${categoryConfig.endpoint}`);
    return response;
  } catch (err: any) {
    console.error(`Error fetching ${category} data:`, err);
    const message = err.response?.message || err.message || `Failed to fetch ${category} data`;
    toastService.showError(message);
    throw err;
  }
};

const fetchSettings = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await restClient.get<Settings>(`${API_URL}/settings/`);
    settings.value = response;
    originalSettings.value = JSON.parse(JSON.stringify(response));

    // If we're on a category that needs additional data, fetch it
    const currentCategory = route.params.category;
    if (currentCategory && typeof currentCategory === 'string') {
      const categoryData = await fetchCategoryData(currentCategory);
      if (categoryData) {
        settings.value = {
          ...settings.value,
          [currentCategory]: categoryData
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

// Update fetchSettings when route changes
watch(() => route.params.category, async (newCategory) => {
  if (newCategory && typeof newCategory === 'string') {
    const categoryData = await fetchCategoryData(newCategory);
    if (categoryData) {
      settings.value = {
        ...settings.value,
        [newCategory]: categoryData
      };
    }
  }
});

const saveConfigProperty = async (category: keyof Settings, subKey: string | null) => {
  const path = subKey ? `${category}.${subKey}` : category;
  savingProperties.value.add(path);

  try {
    let value: any;
    if (subKey) {
      const categoryValue = settings.value[category];
      if (typeof categoryValue === 'object' && categoryValue !== null) {
        value = (categoryValue as any)[subKey];
      } else {
        throw new Error(`Invalid category: ${category}`);
      }
    } else {
      value = settings.value[category];
    }
    
    const patchData = subKey 
      ? { [category]: { [subKey]: value } }
      : { [category]: value };

    const categoryConfig = categories.value.find(c => c.key === category);
    const baseUrl = categoryConfig?.endpoint?.startsWith('/accounts/') 
      ? `${envConfig.GATEWAY_URL}/tools/tactical-rmm`
      : `${envConfig.GATEWAY_URL}/tools/tactical-rmm/core`;
    
    await restClient.patch(`${baseUrl}/settings/`, patchData);
    
    // Update original settings to reflect the saved state
    originalSettings.value = JSON.parse(JSON.stringify(settings.value));
    
    toastService.showSuccess('Settings saved successfully');
  } catch (err: any) {
    console.error('Error saving settings:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save settings';
    toastService.showError(message);
    throw err;
  } finally {
    savingProperties.value.delete(path);
  }
};

onMounted(async () => {
  await fetchSettings();
  
  // If no category in URL, navigate to first available category
  if (!route.params.category && categories.value.length > 0) {
    router.push({ 
      name: 'rmm-settings-category', 
      params: { category: categories.value[0].key }
    });
  }
});
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
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}
</style>
