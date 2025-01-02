<template>
  <div class="nested-object">
    <div
      v-for="(value, key) in (isObjectRecord(props.value) ? props.value : {})"
      :key="key"
      class="nested-field"
    >
      <div class="nested-field-label">{{ formatKey(key) }}</div>
      <div class="nested-field-value">
        <template v-if="isRecord(value)">
          <NestedObjectEditor
            :value="value"
            :isEditable="isEditable"
            @update:value="val => updateNestedValue(key, val)"
          />
        </template>
        <template v-else>
          <template v-if="typeof value === 'boolean'">
            <div class="switch-wrapper">
              <InputSwitch
                v-model="localValue[key]"
                :disabled="!isEditable"
                @update:modelValue="val => handleBooleanChange(key, val)"
                class="settings-switch"
              />
            </div>
          </template>
          <template v-else-if="typeof value === 'number'">
            <InputNumber
              :modelValue="value"
              @update:modelValue="val => updateValue(key, val)"
              :disabled="!isEditable"
              class="w-full"
              :showButtons="false"
              :useGrouping="false"
              @input="event => updateValue(key, event.value)"
            />
          </template>
          <template v-else>
            <InputText
              :modelValue="String(value ?? '')"
              @update:modelValue="val => updateValue(key, val || null)"
              :disabled="!isEditable"
              class="w-full"
            />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, reactive, onMounted, watch, ref } from 'vue';
import { ToastService } from '../services/ToastService';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';

const toastService = ToastService.getInstance();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const props = defineProps<{
  value: Record<string, unknown> | unknown[];
  isEditable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: Record<string, unknown>): void;
  (e: 'error', error: any): void;
}>();

const localValue = reactive<Record<string, any>>({});

// Initialize local values
onMounted(() => {
  if (isObjectRecord(props.value)) {
    Object.entries(props.value).forEach(([key, value]) => {
      localValue[key] = value;
    });
  }
});

// Keep local values in sync with props
watch(() => props.value, (newValue) => {
  if (isObjectRecord(newValue)) {
    Object.entries(newValue).forEach(([key, value]) => {
      localValue[key] = value;
    });
  }
}, { deep: true });

const formatKey = (key: string): string => {
  return key
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

const handleBooleanChange = async (key: string, value: boolean) => {
  if (!isObjectRecord(props.value) || !props.isEditable) return;
  const updatedValue = { ...props.value, [key]: value };
  emit('update:value', updatedValue);
};

const updateValue = async (key: string, newValue: unknown) => {
  if (!isObjectRecord(props.value)) return;
  
  // Handle empty strings
  if (typeof newValue === 'string' && newValue === '') {
    newValue = null;
  }
  
  const updatedValue = { ...props.value, [key]: newValue };
  emit('update:value', updatedValue);
};

const updateNestedValue = async (key: string, newValue: Record<string, unknown>) => {
  if (!isObjectRecord(props.value)) return;
  const updatedValue = { ...props.value, [key]: newValue };
  emit('update:value', updatedValue);
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const handleError = (error: any) => {
  toastService.showError(error.message || 'An error occurred');
};

const handleSuccess = (message: string) => {
  toastService.showSuccess(message);
};
</script>

<style scoped>
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

.switch-wrapper {
  display: flex;
  align-items: center;
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
</style> 