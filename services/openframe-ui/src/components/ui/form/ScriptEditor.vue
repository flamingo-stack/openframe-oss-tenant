<template>
  <div class="of-form-group">
    <label v-if="label" :for="id" class="of-form-label">{{ label }}</label>
    <div :class="['of-script-editor-wrapper', { 'p-invalid': error }]">
      <div ref="editorContainer" class="monaco-editor-container"></div>
    </div>
    <small v-if="error" class="p-error">{{ error }}</small>
    <small v-if="helperText" class="of-text-secondary of-text-sm">{{ helperText }}</small>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onMounted, onBeforeUnmount, watch } from '@vue/runtime-core';

const props = defineProps({
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

const emit = defineEmits(['update:modelValue']);

const editorContainer = ref<HTMLElement | null>(null);
let editor: any = null;

onMounted(async () => {
  if (!editorContainer.value) return;

  try {
    // Dynamically import monaco-editor
    const monaco = await import('monaco-editor');
    
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: 'powershell',
      theme: 'vs-dark',
      readOnly: props.disabled,
      automaticLayout: true,
      minimap: {
        enabled: true
      },
      scrollBeyondLastLine: false,
      fontSize: 12,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      }
    });

    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor?.getValue() || '');
    });
  } catch (error) {
    console.error('Failed to load monaco editor:', error);
  }
});

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue);
  }
});

watch(() => props.disabled, (newValue) => {
  if (editor) {
    editor.updateOptions({ readOnly: newValue });
  }
});

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style>
.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.of-script-editor-wrapper.p-invalid .monaco-editor-container {
  border-color: var(--red-500);
}
</style>
