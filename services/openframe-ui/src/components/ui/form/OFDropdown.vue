<template>
  <div class="of-form-group">
    <label v-if="label" :for="id" class="of-form-label">{{ label }}</label>
    <PrimeDropdown
      :id="id"
      :modelValue="modelValue"
      :options="options"
      :optionLabel="optionLabel"
      :optionValue="optionValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="['of-dropdown', { 'p-invalid': error }]"
      @update:modelValue="$emit('update:modelValue', $event)"
    />
    <small v-if="error" class="p-error">{{ error }}</small>
    <small v-if="helperText" class="of-text-secondary of-text-sm">{{ helperText }}</small>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import PrimeDropdown from 'primevue/dropdown';

defineProps({
  id: {
    type: String,
    default: () => `dropdown-${Math.random().toString(36).substring(2, 9)}`
  },
  modelValue: {
    type: [String, Number, Object],
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
    default: 'Select an option'
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
.of-dropdown {
  width: 100%;
  height: 42px;
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
}

.of-dropdown:not(.p-disabled).p-focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.of-dropdown .p-dropdown-label {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
}

.of-dropdown .p-dropdown-trigger {
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.of-text-sm {
  font-size: 0.875rem;
}
</style>
