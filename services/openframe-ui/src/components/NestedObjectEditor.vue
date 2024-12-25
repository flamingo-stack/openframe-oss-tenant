<template>
  <div class="nested-object">
    <div
      v-for="(value, key) in value"
      :key="key"
      class="nested-field"
    >
      <div class="nested-field-label">{{ formatKey(key) }}</div>
      <div class="nested-field-value">
        <template v-if="typeof value === 'object' && value !== null">
          <NestedObjectEditor
            :value="value"
            :isEditable="isEditable"
            @update:value="val => updateNestedValue(key, val)"
          />
        </template>
        <template v-else>
          <template v-if="typeof value === 'boolean'">
            <InputSwitch
              :modelValue="value"
              @update:modelValue="val => updateValue(key, val)"
              :disabled="!isEditable"
            />
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
              :modelValue="String(value)"
              @update:modelValue="val => updateValue(key, val)"
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
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  value: Record<string, unknown>;
  isEditable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: Record<string, unknown>): void;
}>();

const formatKey = (key: string): string => {
  return key
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const updateValue = (key: string, newValue: unknown) => {
  const updatedValue = { ...props.value, [key]: newValue };
  emit('update:value', updatedValue);
};

const updateNestedValue = (key: string, newValue: Record<string, unknown>) => {
  const updatedValue = { ...props.value, [key]: newValue };
  emit('update:value', updatedValue);
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
</style> 