<template>
  <div class="mdm-dashboard">
    <div class="of-mdm-header">
      <h1 class="of-title">Mobile Device Management</h1>
      <div class="of-actions">
        <Button 
          icon="pi pi-refresh" 
          class="p-button-text" 
          @click="fetchMDMConfig" 
          :loading="loading" 
        />
        <Button 
          icon="pi pi-save" 
          class="p-button-text" 
          @click="saveConfig" 
          :loading="saving"
          :disabled="!hasChanges"
        />
      </div>
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
              <div class="tool-card">
                <div class="tool-header">
                  <h3>{{ formatKey(subKey) }}</h3>
                  <Tag :value="getValueType(subValue)" :severity="getTagSeverity(subValue)" class="tool-category" />
                </div>
                <div class="tool-content">
                  <template v-if="typeof subValue === 'object' && subValue !== null">
                    <div class="json-value">
                      <div class="json-header" @click="toggleExpand(key, subKey)">
                        <i :class="['pi', isExpanded(key, subKey) ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
                        <span>{{ getObjectSummary(subValue) }}</span>
                      </div>
                      <div v-show="isExpanded(key, subKey)" class="json-editor">
                        <Textarea
                          :modelValue="formatJSON(getConfigValue(key, subKey))"
                          @update:modelValue="val => updateConfigValue(key, subKey, JSON.parse(val))"
                          :autoResize="true"
                          rows="5"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="edit-field">
                      <template v-if="typeof subValue === 'boolean'">
                        <InputSwitch
                          :modelValue="getConfigValue(key, subKey) as boolean"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
                        />
                      </template>
                      <template v-else-if="typeof subValue === 'number'">
                        <InputNumber
                          :modelValue="getConfigValue(key, subKey) as number"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
                          class="w-full"
                        />
                      </template>
                      <template v-else>
                        <InputText
                          :modelValue="String(getConfigValue(key, subKey))"
                          @update:modelValue="val => updateConfigValue(key, subKey, val)"
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
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import { restClient } from '../apollo/apolloClient'
import { config as envConfig } from '../config/env.config'

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`

interface ConfigValue {
  [key: string]: string | number | boolean | null | ConfigValue | ConfigValue[]
}

interface Config {
  [key: string]: ConfigValue
}

type EditableValue = string | number | boolean | null | Record<string, unknown> | unknown[]

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const config = ref<Config | null>(null)
const editedConfig = ref<Config>({})
const changedValues = ref<Record<string, any>>({})
const expandedItems = ref(new Set<string>())
const hasChanges = ref(false)

const formatKey = (key: string | number): string => {
  return String(key)
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const getValueType = (value: unknown): string => {
  if (value === null) return 'Null'
  if (Array.isArray(value)) return 'Array'
  if (typeof value === 'object') return 'Object'
  if (typeof value === 'boolean') return 'Boolean'
  if (typeof value === 'number') return 'Number'
  return 'String'
}

const getTagSeverity = (value: unknown): string => {
  if (value === null) return 'danger'
  if (Array.isArray(value)) return 'warning'
  if (typeof value === 'object') return 'info'
  if (typeof value === 'boolean') return 'success'
  return 'primary'
}

const getValueClass = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'empty-value'
  if (typeof value === 'boolean') return `boolean-value ${value ? 'true' : 'false'}`
  if (typeof value === 'number') return 'number-value'
  return 'string-value'
}

const getObjectSummary = (obj: unknown): string => {
  if (Array.isArray(obj)) {
    return `Array [${obj.length} items]`
  }
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj)
    return `Object {${keys.length} properties}`
  }
  return 'Invalid object'
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not set'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return formatJSON(value)
  return String(value)
}

const formatJSON = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(obj)
  }
}

const updateConfigValue = (key: string | number, subKey: string | number | null, value: unknown): void => {
  const keyStr = String(key)
  const subKeyStr = subKey ? String(subKey) : null
  const originalValue = subKeyStr === null 
    ? config.value?.[keyStr]
    : config.value?.[keyStr]?.[subKeyStr]

  // Only track if value actually changed
  if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
    if (subKeyStr === null) {
      editedConfig.value[keyStr] = value as ConfigValue
      changedValues.value[keyStr] = value
    } else {
      if (!editedConfig.value[keyStr]) {
        editedConfig.value[keyStr] = {}
      }
      editedConfig.value[keyStr][subKeyStr] = value as ConfigValue
      // Maintain the nested structure
      if (!changedValues.value[keyStr]) {
        changedValues.value[keyStr] = {}
      }
      changedValues.value[keyStr][subKeyStr] = value
    }
    hasChanges.value = true
  } else {
    // Remove from changed values if it's back to original
    if (subKeyStr === null) {
      delete changedValues.value[keyStr]
    } else {
      if (changedValues.value[keyStr]) {
        delete changedValues.value[keyStr][subKeyStr]
        if (Object.keys(changedValues.value[keyStr]).length === 0) {
          delete changedValues.value[keyStr]
        }
      }
    }
    hasChanges.value = Object.keys(changedValues.value).length > 0
  }
}

const getConfigValue = (key: string | number, subKey: string | number | null): unknown => {
  const keyStr = String(key)
  const subKeyStr = subKey ? String(subKey) : null
  if (subKeyStr === null) {
    return editedConfig.value[keyStr]
  }
  return editedConfig.value[keyStr]?.[subKeyStr]
}

const toggleExpand = (key: string | number, subKey: string | number): void => {
  const itemKey = `${String(key)}.${String(subKey)}`
  if (expandedItems.value.has(itemKey)) {
    expandedItems.value.delete(itemKey)
  } else {
    expandedItems.value.add(itemKey)
  }
}

const isExpanded = (key: string | number, subKey: string | number): boolean => {
  return expandedItems.value.has(`${String(key)}.${String(subKey)}`)
}

const onConfigChange = (): void => {
  hasChanges.value = true
}

const saveConfig = async () => {
  saving.value = true
  error.value = ''
  try {
    const response = await restClient.patch(`${API_URL}/config`, changedValues.value)
    
    // Update the base config with the changes
    config.value = JSON.parse(JSON.stringify(editedConfig.value))
    // Clear changed values
    changedValues.value = {}
    hasChanges.value = false
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Configuration saved successfully',
      life: 3000,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save configuration'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

const fetchMDMConfig = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await restClient.get(`${API_URL}/config`)
    config.value = response
    editedConfig.value = JSON.parse(JSON.stringify(response))
    hasChanges.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch configuration'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMDMConfig()
})
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
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

.json-value {
  font-family: monospace;
  background: var(--surface-section);
  border-radius: var(--border-radius);
  overflow: hidden;
  border: 1px solid var(--surface-border);
}

.json-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  background: var(--surface-section);
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  border-bottom: 1px solid var(--surface-border);
}

.json-header:hover {
  background: var(--surface-hover);
}

.json-editor {
  padding: 1rem;
  background: var(--surface-card);
}

.json-editor :deep(.p-inputtextarea) {
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
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
</style> 