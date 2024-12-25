<template>
  <div class="of-mdm-container">
    <div class="of-mdm-header">
      <h1 class="of-title">Mobile Device Management</h1>
      <div class="of-actions">
        <Button 
          icon="pi pi-refresh" 
          class="p-button-text" 
          @click="fetchMDMConfig" 
          :loading="loading" 
        />
      </div>
    </div>

    <div v-if="error" class="of-error">
      {{ error }}
    </div>

    <div v-else-if="loading" class="of-loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <span>Loading configuration...</span>
    </div>

    <div v-else class="of-mdm-content">
      <div v-for="(value, key) in config" :key="key" class="of-mdm-card">
        <h3 class="of-heading">{{ formatKey(key) }}</h3>
        <div class="of-items">
          <template v-if="typeof value === 'object' && value !== null">
            <div v-for="(subValue, subKey) in value" :key="subKey" class="of-item">
              <span>{{ formatKey(subKey) }}</span>
              <span v-if="typeof subValue === 'object' && subValue !== null" class="json-value">
                {{ formatJSON(subValue) }}
              </span>
              <span v-else>{{ formatValue(subValue) }}</span>
            </div>
          </template>
          <div v-else class="of-item">
            <span>Value</span>
            <span>{{ formatValue(value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'

const toast = useToast()
const loading = ref(true)
const error = ref('')
const config = ref<any>(null)

const formatKey = (key: string | number): string => {
  return String(key)
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return formatJSON(value);
  return String(value);
}

const formatJSON = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

const fetchMDMConfig = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const baseUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_GATEWAY_URL
    const response = await axios.get(`${baseUrl}/tools/fleet/api/v1/fleet/config`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.data) {
      throw new Error('Invalid configuration data received')
    }

    config.value = response.data
  } catch (err: any) {
    console.error('Failed to load configuration:', err)
    error.value = 'Failed to load configuration: ' + (err.response?.data?.message || err.message || 'Unknown error')
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load configuration',
      life: 3000
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
.of-mdm-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--of-spacing-lg);
}

.of-mdm-card {
  background: var(--surface-card);
  border-radius: var(--of-card-radius);
  border: 1px solid var(--surface-border);
  padding: var(--of-spacing-lg);
}

.of-mdm-card h3 {
  margin-bottom: var(--of-spacing-md);
  color: var(--text-color);
  font-weight: 600;
}

.of-items {
  display: flex;
  flex-direction: column;
  gap: var(--of-spacing-md);
}

.of-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--of-spacing-lg);
  padding: var(--of-spacing-xs) 0;
  border-bottom: 1px solid var(--surface-border);
}

.of-item:last-child {
  border-bottom: none;
}

.of-item > span:first-child {
  color: var(--text-color-secondary);
  font-weight: 500;
  min-width: 150px;
}

.of-item > span:last-child {
  text-align: right;
  word-break: break-word;
}

.json-value {
  font-family: monospace;
  white-space: pre-wrap;
  background: var(--surface-section);
  padding: var(--of-spacing-sm);
  border-radius: var(--of-card-radius);
  max-height: 200px;
  overflow-y: auto;
}

:deep(.p-button.p-button-text) {
  color: var(--text-color-secondary);
  padding: var(--of-spacing-sm);
}

:deep(.p-button.p-button-text:hover) {
  background: var(--surface-hover);
}

:deep(.p-button.p-button-text:focus) {
  box-shadow: none;
}
</style> 