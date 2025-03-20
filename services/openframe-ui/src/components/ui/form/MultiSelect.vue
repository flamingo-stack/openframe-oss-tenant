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
import { defineProps, defineEmits } from 'vue';
import PrimeMultiSelect from 'primevue/multiselect';

defineProps({
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
}

.of-text-sm {
  font-size: var(--of-font-size-sm);
}
</style>
