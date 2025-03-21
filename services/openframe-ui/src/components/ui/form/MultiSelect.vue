<template>
  <div class="of-form-group">
    <label v-if="label" :for="id" class="of-form-label">{{ label }}</label>
    <PrimeMultiSelect
      :id="id"
      :modelValue="modelValue"
      :options="options"
      :optionLabel="optionLabel"
      :optionValue="optionValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['of-multiselect', { 'p-invalid': error }]"
      display="chip"
      @update:modelValue="$emit('update:modelValue', $event)"
    />
    <small v-if="error" class="p-error">{{ error }}</small>
    <small v-if="helperText" class="of-text-secondary of-text-sm">{{ helperText }}</small>
  </div>
</template>

<script setup lang="ts">
import PrimeMultiSelect from 'primevue/multiselect';

const props = defineProps({
  id: {
    type: String,
    default: () => `multiselect-${Math.random().toString(36).substring(2, 9)}`
  },
  modelValue: {
    type: Array,
    required: true
  },
  options: {
    type: Array,
    required: true
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  optionValue: {
    type: String,
    default: 'value'
  },
  placeholder: {
    type: String,
    default: 'Select options'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  helperText: {
    type: String,
    default: ''
  }
});

defineEmits(['update:modelValue']);
</script>

<style>
.of-multiselect {
  width: 100%;
  height: 42px;
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
}

.of-multiselect:not(.p-disabled).p-focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.of-multiselect .p-multiselect-label {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
}

.of-multiselect .p-multiselect-trigger {
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.of-text-sm {
  font-size: 0.875rem;
}
</style>
