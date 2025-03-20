<template>
  <div class="of-multiselect">
    <label v-if="label" :for="id" class="block text-sm font-medium mb-1">{{ label }}</label>
    <PrimeMultiSelect
      :id="id"
      :modelValue="modelValue"
      :options="options"
      :optionLabel="optionLabel"
      :optionValue="optionValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'w-full rounded-md border border-surface-border bg-surface-card text-sm',
        { 'border-red-500': error }
      ]"
      display="chip"
      @update:modelValue="$emit('update:modelValue', $event)"
    />
    <small v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</small>
    <small v-if="helperText" class="text-secondary text-xs mt-1">{{ helperText }}</small>
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
