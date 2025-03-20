<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'

export default {
  name: 'MonacoEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'javascript'
    },
    theme: {
      type: String,
      default: 'vs-dark'
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editorContainer = ref(null)
    let editor = null

    onMounted(() => {
      editor = monaco.editor.create(editorContainer.value, {
        value: props.modelValue,
        language: props.language,
        theme: props.theme,
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
      })

      editor.onDidChangeModelContent(() => {
        emit('update:modelValue', editor.getValue())
      })
    })

    watch(() => props.modelValue, (newValue) => {
      if (editor && newValue !== editor.getValue()) {
        editor.setValue(newValue)
      }
    })

    watch(() => props.language, (newValue) => {
      if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), newValue)
      }
    })

    watch(() => props.theme, (newValue) => {
      if (editor) {
        monaco.editor.setTheme(newValue)
      }
    })

    onBeforeUnmount(() => {
      if (editor) {
        editor.dispose()
      }
    })

    return {
      editorContainer
    }
  }
}
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
}
</style> 