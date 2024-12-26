<template>
  <div class="mdm-dashboard">
    <div class="of-mdm-header">
      <h1 class="of-title">MDM Settings</h1>
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
                        v-if="!Array.isArray(subValue)"
                        :value="subValue"
                        :isEditable="isPropertyEditable(subKey, key)"
                        @update:value="val => updateConfigValue(key, subKey, val)"
                      />
                      <div v-else class="array-value">
                        <pre>{{ JSON.stringify(subValue, null, 2) }}</pre>
                      </div>
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
                          @update:modelValue="val => updateConfigValue(key, subKey, val ?? null)"
                          :disabled="!isPropertyEditable(subKey, key)"
                          class="w-full"
                          :showButtons="false"
                          :useGrouping="false"
                          @input="event => updateConfigValue(key, subKey, event.value ?? null)"
                        />
                      </template>
                      <template v-else>
                        <InputText
                          :modelValue="String(getConfigValue(key, subKey) ?? '')"
                          @update:modelValue="val => updateConfigValue(key, subKey, val || null)"
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
                      @update:modelValue="val => updateConfigValue(key, null, val ?? null)"
                      class="w-full"
                      :showButtons="false"
                      :useGrouping="false"
                      @input="event => updateConfigValue(key, null, event.value ?? null)"
                    />
                  </template>
                  <template v-else>
                    <InputText
                      :modelValue="String(getConfigValue(key, null) ?? '')"
                      @update:modelValue="val => updateConfigValue(key, null, val || null)"
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

const getConfigValue = (key: string | number, subKey: string | number | null): EditableValue => {
  if (!config.value) return null;
  
  if (subKey === null) {
    const value = config.value[String(key)];
    return Array.isArray(value) ? null : value as EditableValue;
  }
  
  const value = config.value[String(key)][String(subKey)];
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
    editedConfig.value[String(key)] = {} as ConfigValue;
  }

  // Update the edited config
  if (subKey === null) {
    editedConfig.value[String(key)] = value as ConfigValue;
  } else {
    (editedConfig.value[String(key)] as Record<string, EditableValue>)[String(subKey)] = value;
  }

  // Track the change
  changedValues.value[path] = value;
  hasChanges.value = true;
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
  } catch (err) {
    console.error('Error fetching MDM config:', err);
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
  const path = subKey ? `${key}.${subKey}` : String(key);
  return path in changedValues.value;
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

    if (response.status === 200) {
      // Update the config with the new value
      if (subKey === null) {
        config.value[String(key)] = value as ConfigValue;
      } else {
        (config.value[String(key)] as Record<string, EditableValue>)[String(subKey)] = value;
      }

      // Remove the change from tracking
      delete changedValues.value[path];
      if (Object.keys(changedValues.value).length === 0) {
        hasChanges.value = false;
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Configuration updated successfully',
        life: 3000
      });
    }
  } catch (err) {
    console.error('Error saving config:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update configuration',
      life: 5000
    });
  } finally {
    savingProperties.value.delete(path);
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
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.tool-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.tool-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.tool-tag {
  font-size: 0.8rem;
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
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.non-editable {
  opacity: 0.8;
}

.save-button {
  padding: 0.25rem !important;
}

.save-button .p-button-icon {
  font-size: 1rem;
}
</style> 