<template>
  <div class="mdm-settings">
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
            :to="{ name: 'mdm-settings-category', params: { category: category.key }}"
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

      <router-view v-slot="{ Component }">
        <keep-alive>
          <component 
            :is="Component" 
            :key="$route.params.category || 'default'"
            :config="config"
            :formatKey="formatKey"
            :isPropertyEditable="isPropertyEditable"
            :getValueType="getValueType"
            :getTagSeverity="getTagSeverity"
            :getConfigValue="getConfigValue"
            :updateConfigValue="updateConfigValue"
            :hasPropertyChanges="hasPropertyChanges"
            :isSaving="isSaving"
            :saveConfigProperty="saveConfigProperty"
          />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import NestedObjectEditor from '../../components/NestedObjectEditor.vue';

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

interface ConfigValue {
  [key: string]: string | number | boolean | null | ConfigValue | ConfigValue[] | Record<string, unknown>;
}

interface Config {
  [key: string]: ConfigValue;
}

type EditableValue = string | number | boolean | null | Record<string, unknown>;

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const error = ref<string>('');
const config = ref<Config | null>(null);
const editedConfig = ref<Config>({});
const changedValues = ref<Record<string, EditableValue>>({});
const hasChanges = ref(false);
const savingProperties = ref(new Set<string>());

const route = useRoute();
const router = useRouter();

const isPropertyEditable = (key: string | number, parentKey?: string | number): boolean => {
  // Known read-only fields that should never be editable
  const READ_ONLY_FIELDS = new Set([
    'id',
    'created_at',
    'updated_at',
    'version',
    'type',
    'status',
    'last_seen',
    'seen',
    'hostname',
    'uuid',
    'platform',
    'osquery_version'
  ]);

  // Read-only sections that contain only read-only fields
  const READ_ONLY_SECTIONS = new Set([
    'license',
    'host_settings',
    'server_url',
    'logging',
    'metadata'
  ]);

  // If it's a read-only field, it's never editable
  if (READ_ONLY_FIELDS.has(String(key))) {
    return false;
  }

  // If it's a read-only section, it's never editable
  if (READ_ONLY_SECTIONS.has(String(key)) || READ_ONLY_SECTIONS.has(String(parentKey))) {
    return false;
  }

  // All top-level properties from the API are editable unless in READ_ONLY_SECTIONS
  const EDITABLE_SECTIONS = new Set([
    'org_info',
    'server_settings',
    'smtp_settings',
    'sso_settings',
    'host_expiry_settings',
    'activity_expiry_settings',
    'agent_options',
    'fleet_desktop',
    'webhook_settings',
    'integrations',
    'mdm',
    'features',
    'scripts'
  ]);

  // If it's a top-level property, check if it's in the editable sections
  if (!parentKey) {
    return EDITABLE_SECTIONS.has(String(key));
  }

  // For nested properties, they are editable if their parent is editable
  // and they're not in the READ_ONLY_FIELDS list
  return EDITABLE_SECTIONS.has(String(parentKey));
};

const formatKey = (key: string | number): string => {
  return String(key)
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Define known types from Fleet API documentation
const KNOWN_TYPES: Record<string, Record<string, string>> = {
  webhook_settings: {
    host_status_webhook: 'Object',
    failing_policies_webhook: 'Object',
    vulnerabilities_webhook: 'Object',
    activities_webhook: 'Object',
    interval: 'String'
  },
  integrations: {
    jira: 'Array',
    zendesk: 'Array',
    google_calendar: 'Array',
    ndes_scep_proxy: 'Object'
  }
};

const getValueType = (value: unknown, parentKey?: string | number, key?: string | number): string => {
  // Check if we have a known type for this field
  if (parentKey && key && KNOWN_TYPES[String(parentKey)]?.[String(key)]) {
    return KNOWN_TYPES[String(parentKey)][String(key)];
  }

  // For null values, try to infer type from similar fields or default to "Not Set"
  if (value === null) {
    return 'Not Set';
  }

  if (Array.isArray(value)) return 'Array';
  if (typeof value === 'object') return 'Object';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return 'Number';
  return 'String';
};

const getTagSeverity = (value: unknown, type?: string): string => {
  const actualType = type || getValueType(value);
  if (actualType === 'Not Set') return 'info';
  if (Array.isArray(value)) return 'warning';
  if (typeof value === 'object') return 'info';
  if (typeof value === 'boolean') return 'success';
  return 'primary';
};

const getValueClass = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'empty-value';
  if (typeof value === 'boolean') return `boolean-value ${value ? 'true' : 'false'}`;
  if (typeof value === 'number') return 'number-value';
  return 'string-value';
};

const getConfigValue = (key: string | number, subKey: string | number | null): EditableValue => {
  if (!config.value) return null;
  
  if (subKey === null) {
    const value = editedConfig.value[String(key)] ?? config.value[String(key)];
    return Array.isArray(value) ? null : value as EditableValue;
  }
  
  const parentValue = editedConfig.value[String(key)] ?? config.value[String(key)];
  const value = (parentValue as Record<string, EditableValue>)?.[String(subKey)] ?? config.value[String(key)][String(subKey)];
  return Array.isArray(value) ? null : value as EditableValue;
};

const updateConfigValue = (key: string | number, subKey: string | number | null, value: EditableValue) => {
  if (!config.value) return;

  // Don't update if the value is an array
  if (Array.isArray(value)) {
    return;
  }

  // Create the path key for tracking changes
  const path = subKey ? `${key}.${subKey}` : String(key);

  // Initialize the edited config structure if it doesn't exist
  if (!editedConfig.value[String(key)]) {
    editedConfig.value[String(key)] = subKey === null ? {} : { ...config.value[String(key)] };
  }

  // Normalize empty values
  const normalizedValue = value === '' ? null : value;

  // Update the edited config
  if (subKey === null) {
    editedConfig.value[String(key)] = normalizedValue as ConfigValue;
  } else {
    if (typeof editedConfig.value[String(key)] !== 'object') {
      editedConfig.value[String(key)] = { ...config.value[String(key)] };
    }
    (editedConfig.value[String(key)] as Record<string, EditableValue>)[String(subKey)] = normalizedValue;
  }

  // Get original value for comparison
  const originalValue = subKey === null 
    ? config.value[String(key)]
    : config.value[String(key)][String(subKey)];

  // Normalize original value for comparison
  const normalizedOriginal = originalValue === '' ? null : originalValue;

  // Special handling for empty/null values
  if (normalizedValue === null && normalizedOriginal === null) {
    delete changedValues.value[path];
  } else if (normalizedValue === undefined && normalizedOriginal === null) {
    delete changedValues.value[path];
  } else if (normalizedValue === null && normalizedOriginal === undefined) {
    delete changedValues.value[path];
  } else if (JSON.stringify(normalizedValue) !== JSON.stringify(normalizedOriginal)) {
    changedValues.value[path] = normalizedValue;
  } else {
    delete changedValues.value[path];
  }

  hasChanges.value = Object.keys(changedValues.value).length > 0;
};

const extractUrlFromMessage = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.match(urlRegex);
  if (match) {
    const url = match[0];
    const textWithoutUrl = message.replace(url, '');
    return { url, text: textWithoutUrl.trim() };
  }
  return { text: message };
};

const fetchMDMConfig = async () => {
  loading.value = true;
  error.value = '';
  try {
    console.log('Fetching MDM config from:', API_URL);
    const response = await restClient.get(`${API_URL}/config`);
    console.log('MDM config response:', response);

    if (!response) {
      throw new Error('No response from server');
    }

    // Handle both possible response formats
    const configData = response.data || response;
    if (!configData || typeof configData !== 'object') {
      throw new Error('Invalid response format from server');
    }

    config.value = configData;
    editedConfig.value = JSON.parse(JSON.stringify(configData));
    hasChanges.value = false;
  } catch (err: any) {
    console.error('Error fetching MDM config:', err);
    console.error('Error response:', err.response);
    
    // Get the error message from the response data
    const errorData = err.response?.data;
    const message = errorData?.message || err.message || 'Failed to fetch configuration';
    const { url, text } = extractUrlFromMessage(message);
    
    // Set error message with clickable link if URL exists
    const htmlContent = url 
      ? `${text} <a href="${url}" target="_blank" style="color: var(--red-700); text-decoration: underline;">${url}</a>`
      : text;
    
    error.value = htmlContent;
    
    toast.add({
      severity: 'error',
      summary: `HTTP error (${err.response?.status || 'Unknown'})`,
      detail: text + (url ? ` ${url}` : ''),
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const handleSaveConfig = async (retryCount = 0) => {
  saving.value = true;
  error.value = '';
  try {
    // Create config object with the same structure as received
    const fleetConfig: Record<string, unknown> = {};

    // Map the changed values maintaining their original structure
    Object.entries(changedValues.value).forEach(([key, value]: [string, unknown]) => {
      if (isPropertyEditable(key)) {
        fleetConfig[key] = value;
      }
    });

    const response = await restClient.patch(
      `${API_URL}/config`,
      fleetConfig
    );

    // If we got any response object, consider it a success and fetch fresh data
    if (response && typeof response === 'object') {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Configuration updated successfully',
        life: 3000
      });
      
      // Fetch fresh data
      await fetchMDMConfig();
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (err: any) {
    console.error('Update error:', err);
    console.error('Error response:', err.response);
    
    // Get the error message from the response data
    const errorData = err.response?.data;
    const message = errorData?.message || err.message || 'Failed to update configuration';
    const { url, text } = extractUrlFromMessage(message);
    
    error.value = url 
      ? `${text} <a href="${url}" target="_blank" style="color: var(--red-700); text-decoration: underline;">${url}</a>`
      : text;
    
    toast.add({
      severity: 'error',
      summary: `HTTP error (${err.response?.status || 'Unknown'})`,
      detail: text + (url ? ` ${url}` : ''),
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const saveConfig = () => {
  handleSaveConfig(0);
};

const getPropertyKey = (key: string | number, subKey: string | number | null): string => {
  return subKey ? `${key}.${subKey}` : String(key);
};

const hasPropertyChanges = (key: string | number, subKey: string | number | null): boolean => {
  if (!config.value) return false;
  
  const path = subKey ? `${key}.${subKey}` : String(key);
  
  // Get current value
  const currentValue = subKey === null 
    ? editedConfig.value[String(key)]
    : (editedConfig.value[String(key)] as Record<string, EditableValue>)?.[String(subKey)];

  // Get original value
  const originalValue = subKey === null 
    ? config.value[String(key)]
    : config.value[String(key)][String(subKey)];

  // Normalize values for comparison
  const normalizedCurrent = currentValue === '' ? null : currentValue;
  const normalizedOriginal = originalValue === '' ? null : originalValue;

  // Special handling for empty/null values
  if (normalizedCurrent === null && normalizedOriginal === null) return false;
  if (normalizedCurrent === undefined && normalizedOriginal === null) return false;
  if (normalizedCurrent === null && normalizedOriginal === undefined) return false;

  // Compare values
  return JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
};

const isSaving = (key: string | number, subKey: string | number | null): boolean => {
  const path = subKey ? `${key}.${subKey}` : String(key);
  return savingProperties.value.has(path);
};

const saveConfigProperty = async (key: string | number, subKey: string | number | null) => {
  if (!config.value) return;

  const path = subKey ? `${key}.${subKey}` : String(key);
  savingProperties.value.add(path);

  try {
    const value = subKey === null ? editedConfig.value[String(key)] : (editedConfig.value[String(key)] as Record<string, EditableValue>)[String(subKey)];
    
    // Don't save if the value is an array
    if (Array.isArray(value)) {
      throw new Error('Array values cannot be edited');
    }

    const response = await restClient.patch(`${API_URL}/config`, {
      [String(key)]: subKey === null ? value : { [String(subKey)]: value }
    });

    // Update the config with the new value
    if (subKey === null) {
      config.value[String(key)] = value as ConfigValue;
    } else {
      if (typeof config.value[String(key)] !== 'object') {
        config.value[String(key)] = {};
      }
      (config.value[String(key)] as Record<string, EditableValue>)[String(subKey)] = value;
    }

    // Update editedConfig to match config
    if (subKey === null) {
      editedConfig.value[String(key)] = value as ConfigValue;
    } else {
      if (typeof editedConfig.value[String(key)] !== 'object') {
        editedConfig.value[String(key)] = {};
      }
      (editedConfig.value[String(key)] as Record<string, EditableValue>)[String(subKey)] = value;
    }

    // Remove the change from tracking
    delete changedValues.value[path];
    hasChanges.value = Object.keys(changedValues.value).length > 0;

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Configuration updated successfully',
      life: 3000
    });
  } catch (err: any) {
    console.error('Error saving config:', err);
    throw err; // Re-throw to be handled by SettingsCategory
  } finally {
    savingProperties.value.delete(path);
  }
};

const categories = computed(() => {
  if (!config.value) return [];
  
  return Object.keys(config.value)
    .filter(key => isPropertyEditable(key))
    .map(key => ({
      label: formatKey(key),
      key: key,
      icon: getCategoryIcon(key)
    }));
});

const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    org_info: 'pi pi-building',
    server_settings: 'pi pi-server',
    smtp_settings: 'pi pi-envelope',
    sso_settings: 'pi pi-key',
    host_expiry_settings: 'pi pi-clock',
    activity_expiry_settings: 'pi pi-history',
    agent_options: 'pi pi-cog',
    fleet_desktop: 'pi pi-desktop',
    webhook_settings: 'pi pi-link',
    integrations: 'pi pi-share-alt',
    mdm: 'pi pi-mobile',
    features: 'pi pi-star',
    scripts: 'pi pi-code'
  };
  return iconMap[category] || 'pi pi-cog';
};

const activeCategory = ref<string>('');

const nonBooleanFields = computed(() => {
  if (!config.value || !activeCategory.value) return {};
  return Object.entries(config.value[activeCategory.value])
    .filter(([_, val]) => getValueType(val, activeCategory.value) !== 'Boolean')
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
});

const booleanFields = computed(() => {
  if (!config.value || !activeCategory.value) return {};
  return Object.entries(config.value[activeCategory.value])
    .filter(([_, val]) => getValueType(val, activeCategory.value) === 'Boolean')
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
});

const isActiveCategory = (key: string): boolean => {
  return route.params.category === key || (!route.params.category && categories.value[0]?.key === key);
};

const navigateToCategory = (key: string) => {
  router.push({ name: 'mdm-settings-category', params: { category: key } });
};

watch(
  () => route.params.category,
  (newCategory) => {
    if (newCategory) {
      activeCategory.value = String(newCategory);
    } else if (categories.value.length > 0) {
      // If no category in URL, navigate to first available category
      router.push({ 
        name: 'mdm-settings-category', 
        params: { category: categories.value[0].key }
      });
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchMDMConfig().then(() => {
    // If no category in URL, navigate to first available category
    if (!route.params.category && categories.value.length > 0) {
      router.push({ 
        name: 'mdm-settings-category', 
        params: { category: categories.value[0].key }
      });
    }
  });
});
</script>

<style scoped>
.mdm-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem;
}

.settings-layout {
  display: flex;
  gap: 2rem;
  flex: 1;
  min-height: 0;
  height: calc(100vh - 200px);
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
  height: 100%;
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

.settings-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: var(--surface-ground);
  border-radius: 8px;
}

.mdm-dashboard {
  padding: 2rem;
}

.of-mdm-header {
  margin-bottom: 2rem;
}

.of-title {
  font-size: 2rem;
  margin: 0;
}

.tool-card {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  min-height: 3rem;
  gap: 1rem;
}

.tool-header-left {
  flex: 1;
}

.tool-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  position: relative;
  min-height: 2.5rem;
}

.tool-header-right .save-button-wrapper {
  flex: 0 0 2rem;
  width: 2rem;
  height: 2rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-button {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  width: 100%;
  height: 100%;
  visibility: hidden;
  position: relative;
}

.save-button:not([disabled]) {
  opacity: 1;
  visibility: visible;
}

.non-editable {
  opacity: 0.8;
  background: var(--surface-ground);
}

.non-editable:hover {
  transform: none;
  box-shadow: var(--card-shadow);
}

.non-editable .tool-content {
  cursor: not-allowed;
}

:deep(.p-inputswitch.p-disabled) {
  opacity: 0.8;
  cursor: not-allowed;
}

:deep(.p-inputswitch.p-disabled .p-inputswitch-slider) {
  background: var(--surface-300);
}

:deep(.p-inputnumber.p-disabled) input {
  opacity: 0.8;
  cursor: not-allowed;
  background: var(--surface-200);
}

:deep(.p-inputtext.p-disabled) {
  opacity: 0.8;
  cursor: not-allowed;
  background: var(--surface-200);
}

.tool-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.tool-tags {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  min-height: 2rem;
  flex: 1;
}

.tool-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  white-space: nowrap;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.tool-content {
  flex: 1;
}

.edit-field {
  margin-top: 0.5rem;
}

.nested-object-wrapper {
  margin-top: 0.5rem;
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
}

.array-value {
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
  overflow: auto;
  max-height: 300px;
}

.array-value pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
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

  :deep(a) {
    color: var(--red-700);
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  }
}

:deep(.p-toast-message-error) {
  a {
    color: inherit;
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  }
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  width: 100%;
}

:deep(.settings-switch) {
  .p-inputswitch {
    width: 3rem;
    height: 1.5rem;
  }

  .p-inputswitch .p-inputswitch-slider {
    background: var(--surface-300);
  }

  .p-inputswitch:not(.p-disabled):hover .p-inputswitch-slider {
    background: var(--surface-400);
  }

  .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider {
    background: var(--yellow-500) !important;
  }

  .p-inputswitch.p-inputswitch-checked:not(.p-disabled):hover .p-inputswitch-slider {
    background: var(--yellow-600) !important;
  }

  .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider:before {
    background: var(--surface-0) !important;
  }

  .p-inputswitch .p-inputswitch-slider:before {
    background: var(--surface-0);
    width: 1.25rem;
    height: 1.25rem;
    left: 0.125rem;
    margin-top: -0.625rem;
    border-radius: 50%;
    transition-duration: 0.2s;
  }

  .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider:before {
    transform: translateX(1.5rem);
  }

  .p-inputswitch.p-disabled {
    opacity: 0.6;
  }

  .p-inputswitch.p-disabled .p-inputswitch-slider {
    background: var(--surface-200);
    cursor: not-allowed;
  }
}

.non-editable {
  opacity: 0.8;
  background: var(--surface-ground);
}

.non-editable .tool-content {
  opacity: 0.6;
}

.non-editable :deep(.p-inputswitch),
.non-editable :deep(.p-inputtext),
.non-editable :deep(.p-inputnumber) {
  pointer-events: none;
}

.settings-layout {
  display: flex;
  gap: 2rem;
  min-height: calc(100vh - 200px);
}

.settings-nav {
  flex: 0 0 250px;
  background: var(--surface-card);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.settings-menu li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.settings-menu li:hover {
  background: var(--surface-hover);
}

.settings-menu li.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.settings-menu li i {
  font-size: 1.2rem;
}

.settings-content {
  flex: 1;
  overflow: auto;
}
</style> 