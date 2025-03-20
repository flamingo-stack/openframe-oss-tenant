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
import * as monaco from 'monaco-editor';

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
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  if (!editorContainer.value) return;

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
});

watch(() => props.modelValue, (newValue: string) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue);
  }
});

watch(() => props.disabled, (newValue: boolean) => {
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
