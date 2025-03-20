<template>
  <div class="of-script-editor">
    <label v-if="label" :for="id" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div :class="['relative', { 'border-red-500': error }]">
      <textarea
        :id="id"
        :value="modelValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="w-full font-mono text-sm p-4 bg-surface-ground text-primary 
               border border-surface-border rounded-md resize-y transition-all 
               focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
    <small v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</small>
    <small v-if="helperText" class="text-secondary text-xs mt-1">{{ helperText }}</small>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

defineProps({
  id: {
    type: String,
    default: () => `script-editor-${Math.random().toString(36).substring(2, 9)}`
  },
  modelValue: {
    type: String,
    required: true
  },
  rows: {
    type: Number,
    default: 10
  },
  placeholder: {
    type: String,
    default: 'Enter your script here'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
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
