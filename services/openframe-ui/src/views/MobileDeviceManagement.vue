<template>
  <div class="mdm-dashboard">
    <div class="of-mdm-header">
      <h1 class="of-title">Mobile Device Management</h1>
    </div>

    <div v-if="error" class="error-message">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="loading" class="loading-spinner">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <span>Loading configuration...</span>
    </div>

    <div v-else>
      <section v-for="(value, key) in config" :key="key" class="mb-4">
        <h2>{{ formatKey(key) }}</h2>
        <div class="grid">
          <template v-if="typeof value === 'object' && value !== null">
            <div v-for="(subValue, subKey) in value" 
                 :key="subKey" 
                 class="col-12 md:col-6 xl:col-4 mb-3">
              <div class="tool-card" :class="{ 'non-editable': !isPropertyEditable(subKey, key) }">
                <div class="tool-header">
                  <div class="tool-header-left">
                    <h3>{{ formatKey(subKey) }}</h3>
                  </div>
                  <div class="tool-header-right">
                    <div class="tool-tags">
                      <Button v-if="hasPropertyChanges(key, subKey)"
                        icon="pi pi-save"
                        class="p-button-text p-button-sm save-button"
                        @click="saveConfigProperty(key, subKey)"
                        :loading="isSaving(key, subKey)"
                      />
                      <Tag v-if="!isPropertyEditable(subKey, key)" 
                           value="Read Only" 
                           severity="warning" 
                           class="tool-tag" />
                      <Tag :value="getValueType(subValue, key, subKey)" 
                           :severity="getTagSeverity(subValue, getValueType(subValue, key, subKey))" 
                           class="tool-tag" />
                    </div>
                  </div>
                </div>
                <div class="tool-content">
                  <template v-if="typeof subValue === 'object' && subValue !== null">
                    <div class="nested-object-wrapper">
                      <NestedObjectEditor
                        :value="subValue"
                        :isEditable="isPropertyEditable(subKey, key)"
                        @update:value="val => updateConfigValue(key, subKey, val)"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <div class="edit-field">
                      <template v-if="typeof subValue === 'boolean'">
                        <InputSwitch
                          :modelValue="getConfigValue(key, subKey) as boolean"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
                          :disabled="!isPropertyEditable(subKey, key)"
                        />
                      </template>
                      <template v-else-if="typeof subValue === 'number'">
                        <InputNumber
                          :modelValue="getConfigValue(key, subKey) as number"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
                          :disabled="!isPropertyEditable(subKey, key)"
                          class="w-full"
                          :showButtons="false"
                          :useGrouping="false"
                          @input="event => updateConfigValue(key, subKey, event.value)"
                        />
                      </template>
                      <template v-else>
                        <InputText
                          :modelValue="String(getConfigValue(key, subKey))"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
                          :disabled="!isPropertyEditable(subKey, key)"
                          class="w-full"
                        />
                      </template>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="col-12 md:col-6 xl:col-4 mb-3">
            <div class="tool-card">
              <div class="tool-header">
                <h3>Value</h3>
                <Tag :value="getValueType(value)" :severity="getTagSeverity(value)" class="tool-category" />
              </div>
              <div class="tool-content">
                <div class="edit-field">
                  <template v-if="typeof value === 'boolean'">
                    <InputSwitch
                      :modelValue="getConfigValue(key, null) as boolean"
                      @update:modelValue="val => updateConfigValue(key, null, val)"
                    />
                  </template>
                  <template v-else-if="typeof value === 'number'">
                    <InputNumber
                      :modelValue="getConfigValue(key, null) as number"
                      @update:modelValue="val => updateConfigValue(key, null, val)"
                      class="w-full"
                      :showButtons="false"
                      :useGrouping="false"
                      @input="event => updateConfigValue(key, null, event.value)"
                    />
                  </template>
                  <template v-else>
                    <InputText
                      :modelValue="String(getConfigValue(key, null))"
                      @update:modelValue="val => updateConfigValue(key, null, val)"
                      class="w-full"
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import { restClient } from '../apollo/apolloClient';
import { config as envConfig } from '../config/env.config';
import NestedObjectEditor from '../components/NestedObjectEditor.vue';

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

interface ConfigValue {
  [key: string]: string | number | boolean | null | ConfigValue | ConfigValue[] | Record<string, unknown>;
}

interface Config {
  [key: string]: ConfigValue;
}

type EditableValue = string | number | boolean | null | Record<string, unknown> | unknown[];

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const error = ref<string>('');
const config = ref<Config | null>(null);
const editedConfig = ref<Config>({});
const changedValues = ref<Record<string, any>>({});
const hasChanges = ref(false);
const savingProperties = ref(new Set<string>());

const isPropertyEditable = (key: string | number, parentKey?: string | number): boolean => {
  // All top-level properties from the API are editable
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

const updateConfigValue = (key: string | number, subKey: string | number | null, value: unknown): void => {
  const keyStr = String(key);
  const subKeyStr = subKey ? String(subKey) : null;
  const originalValue = subKeyStr === null 
    ? config.value?.[keyStr]
    : config.value?.[keyStr]?.[subKeyStr];

  // Only track if value actually changed
  if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
    if (subKeyStr === null) {
      editedConfig.value[keyStr] = value as ConfigValue;
      changedValues.value[keyStr] = value;
    } else {
      if (!editedConfig.value[keyStr]) {
        editedConfig.value[keyStr] = { ...config.value![keyStr] };
      }
      
      // Handle nested objects (e.g., webhook settings)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!changedValues.value[keyStr]) {
          changedValues.value[keyStr] = {};
        }
        changedValues.value[keyStr][subKeyStr] = value as ConfigValue;
        editedConfig.value[keyStr][subKeyStr] = value as ConfigValue;
      } else {
        editedConfig.value[keyStr][subKeyStr] = value as ConfigValue;
        if (!changedValues.value[keyStr]) {
          changedValues.value[keyStr] = {};
        }
        changedValues.value[keyStr][subKeyStr] = value as ConfigValue;
      }
    }
  } else {
    // Value is back to original - update editedConfig and remove from changedValues
    if (subKeyStr === null) {
      editedConfig.value[keyStr] = originalValue as ConfigValue;
      delete changedValues.value[keyStr];
    } else {
      editedConfig.value[keyStr][subKeyStr] = originalValue as ConfigValue;
      if (changedValues.value[keyStr]) {
        delete changedValues.value[keyStr][subKeyStr];
        if (Object.keys(changedValues.value[keyStr]).length === 0) {
          delete changedValues.value[keyStr];
        }
      }
    }
  }
  hasChanges.value = Object.keys(changedValues.value).length > 0;
};

const getConfigValue = (key: string | number, subKey: string | number | null): unknown => {
  const keyStr = String(key);
  const subKeyStr = subKey ? String(subKey) : null;
  if (subKeyStr === null) {
    return editedConfig.value[keyStr];
  }
  return editedConfig.value[keyStr]?.[subKeyStr];
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
  } catch (err) {
    console.error('Update error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
    
    // Check if it's an Unprocessable Entity error and we haven't exceeded retry attempts
    if (errorMessage.includes('Unprocessable Entity') && retryCount < 2) {
      // Wait a short delay before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch fresh config before retrying
      await fetchMDMConfig();
      
      // Retry the save operation
      return handleSaveConfig(retryCount + 1);
    }
    
    error.value = errorMessage;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    });
  } finally {
    saving.value = false;
  }
};

const saveConfig = () => {
  handleSaveConfig(0);
};

const fetchMDMConfig = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await restClient.get(`${API_URL}/config`);
    config.value = response;
    editedConfig.value = JSON.parse(JSON.stringify(response));
    hasChanges.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch configuration';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
};

const getPropertyKey = (key: string | number, subKey: string | number | null): string => {
  return subKey ? `${key}.${subKey}` : String(key);
};

const hasPropertyChanges = (key: string | number, subKey: string | number | null): boolean => {
  const keyStr = String(key);
  const subKeyStr = subKey ? String(subKey) : null;
  
  if (subKeyStr === null) {
    return keyStr in changedValues.value;
  }
  
  return keyStr in changedValues.value && subKeyStr in changedValues.value[keyStr];
};

const isSaving = (key: string | number, subKey: string | number | null): boolean => {
  return savingProperties.value.has(getPropertyKey(key, subKey));
};

const saveConfigProperty = async (key: string | number, subKey: string | number | null, retryCount = 0) => {
  const propertyKey = getPropertyKey(key, subKey);
  const keyStr = String(key);
  savingProperties.value.add(propertyKey);
  
  try {
    const fleetConfig: Record<string, unknown> = {};
    
    if (subKey === null) {
      if (isPropertyEditable(keyStr)) {
        fleetConfig[keyStr] = changedValues.value[keyStr];
      }
    } else {
      const subKeyStr = String(subKey);
      if (isPropertyEditable(subKeyStr, keyStr)) {
        fleetConfig[keyStr] = {
          [subKeyStr]: changedValues.value[keyStr][subKeyStr]
        };
      }
    }

    const response = await restClient.patch(
      `${API_URL}/config`,
      fleetConfig
    );

    if (response && typeof response === 'object') {
      // Update only the specific property in the config
      if (subKey === null) {
        config.value![keyStr] = response[keyStr];
        editedConfig.value[keyStr] = response[keyStr];
        delete changedValues.value[keyStr];
      } else {
        const subKeyStr = String(subKey);
        config.value![keyStr][subKeyStr] = response[keyStr][subKeyStr];
        editedConfig.value[keyStr][subKeyStr] = response[keyStr][subKeyStr];
        delete changedValues.value[keyStr][subKeyStr];
        if (Object.keys(changedValues.value[keyStr]).length === 0) {
          delete changedValues.value[keyStr];
        }
      }

      hasChanges.value = Object.keys(changedValues.value).length > 0;
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Property updated successfully',
        life: 3000
      });

      // Fetch fresh data in the background without showing loading state
      restClient.get(`${API_URL}/config`).then(response => {
        config.value = response;
        editedConfig.value = JSON.parse(JSON.stringify(response));
      }).catch(console.error);
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (err) {
    console.error('Update error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to update property';
    
    if (errorMessage.includes('Unprocessable Entity') && retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch only the specific property
      const response = await restClient.get(`${API_URL}/config`);
      if (subKey === null) {
        config.value![keyStr] = response[keyStr];
        editedConfig.value[keyStr] = response[keyStr];
      } else {
        const subKeyStr = String(subKey);
        config.value![keyStr][subKeyStr] = response[keyStr][subKeyStr];
        editedConfig.value[keyStr][subKeyStr] = response[keyStr][subKeyStr];
      }
      
      return saveConfigProperty(key, subKey, retryCount + 1);
    }
    
    error.value = errorMessage;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    });
  } finally {
    savingProperties.value.delete(propertyKey);
  }
};

onMounted(() => {
  fetchMDMConfig();
});
</script>

<style scoped>
.mdm-dashboard {
  padding: 2rem;
}

.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.of-actions {
  display: flex;
  gap: 0.5rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.tool-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--card-shadow);
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.tool-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
  min-height: 2.5rem;
}

.tool-header-left {
  flex: 1;
}

.tool-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  position: relative;
  padding-left: 2.5rem;
}

.save-button {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  width: 2rem;
  height: 2rem;
  z-index: 1;
}

.save-button:not([disabled]) {
  opacity: 1;
}

.tool-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.tool-category {
  margin-left: auto;
}

.tool-content {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.edit-field {
  padding: 0.5rem 0;
}

.empty-value {
  color: var(--text-color-secondary);
  font-style: italic;
}

.boolean-value {
  font-weight: 500;
}

.boolean-value.true {
  color: var(--green-600);
}

.boolean-value.false {
  color: var(--red-600);
}

.number-value {
  color: var(--primary-700);
  font-family: monospace;
  font-size: 1rem;
}

.string-value {
  color: var(--text-900);
  font-size: 1rem;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--red-500);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--primary-color);
}

:deep(.p-tag) {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
}

.tool-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.tool-tag {
  font-size: 0.75rem !important;
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

.nested-object-wrapper {
  padding: 0.5rem;
  background: var(--surface-section);
  border-radius: var(--border-radius);
}

.nested-object {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nested-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nested-field-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.nested-field-value {
  width: 100%;
}

.nested-field .nested-object {
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px solid var(--surface-border);
}

.tool-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.p-button.p-button-sm) {
  padding: 0.25rem;
  font-size: 0.875rem;
}

:deep(.p-button.p-button-sm .p-button-icon) {
  font-size: 0.875rem;
}
</style> 