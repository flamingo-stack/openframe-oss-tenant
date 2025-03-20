<template>
  <div class="of-form-group">
    <label v-if="label" :for="id" class="of-form-label">{{ label }}</label>
    <div :class="['of-script-editor-wrapper', { 'p-invalid': error }]">
      <textarea
        :id="id"
        :value="modelValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="of-script-editor code-editor"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
    <small v-if="error" class="p-error">{{ error }}</small>
    <small v-if="helperText" class="of-text-secondary of-text-sm">{{ helperText }}</small>
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

<style>
.of-script-editor {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 1rem;
  background: var(--surface-ground);
  color: var(--text-color);
  border: none;
  border-radius: var(--border-radius);
  resize: vertical;
  transition: all 0.2s;
  outline: none !important;
}

.of-script-editor:hover {
  background: var(--surface-hover);
}

.of-script-editor:focus {
  background: var(--surface-hover);
  box-shadow: var(--focus-ring);
}

.of-script-editor::placeholder {
  color: var(--text-color-secondary);
  opacity: 0.7;
}

.of-script-editor-wrapper.p-invalid .of-script-editor {
  border-color: var(--red-500);
}
</style>
