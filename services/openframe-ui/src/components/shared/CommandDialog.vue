<template>
  <Dialog 
    :visible="visible"
    @update:visible="(val) => emit('update:visible', val)"
    header="Run Command"
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid">
      <div class="col-12">
        <div class="field">
          <label for="command">Command</label>
          <ScriptEditor 
            id="command" 
            v-model="command" 
            :rows="4"
            required
            :error="submitted && !command ? 'Command is required.' : ''"
            helperText="The command will be executed on the selected device. Make sure to use the correct syntax for the target platform."
          />
        </div>

        <div v-if="output" class="field">
          <label>Output</label>
          <pre class="command-output">{{ output }}</pre>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <OFButton 
          label="Close" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="onCancel"
        />
        <OFButton 
          label="Run" 
          icon="pi pi-play" 
          class="p-button-primary" 
          @click="onRun"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, OFButton, ScriptEditor } from '../../components/ui';

const props = defineProps<{
  visible: boolean;
  lastCommand?: { cmd: string; output: string } | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'run', command: string): Promise<string>;
  (e: 'update:output', output: string): void;
  (e: 'cancel'): void;
}>();

const command = ref('');
const output = ref('');
const submitted = ref(false);

watch(() => props.visible, (newValue) => {
  if (!newValue) {
    resetForm();
  } else if (props.lastCommand) {
    // If dialog is opened and we have a last command, show it
    command.value = props.lastCommand.cmd;
    output.value = props.lastCommand.output;
  }
});

const onRun = async () => {
  submitted.value = true;
  if (!command.value) return;
  
  // Ensure proper command string formatting with correct spacing
  const parts = command.value.trim().match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  const normalizedCommand = parts
    .map(part => {
      // If it's already quoted, keep it as is
      if (part.startsWith('"') && part.endsWith('"')) return part;
      // If it contains spaces, quote it
      if (part.includes(' ')) return `"${part}"`;
      return part;
    })
    .join(' ');
  
  try {
    await emit('run', normalizedCommand);
  } catch (error: any) {
    const errorMessage = `Error: ${error?.message || 'Unknown error'}`;
    output.value = errorMessage;
    emit('update:output', errorMessage);
  }
};

const onCancel = () => {
  emit('update:visible', false);
  emit('cancel');
  resetForm();
};

const resetForm = () => {
  command.value = '';
  output.value = '';
  submitted.value = false;
};
</script>

<style>
.p-dialog-custom {
  .p-dialog-header {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-dialog-content {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
  }

  .p-dialog-footer {
    background: var(--surface-section);
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--surface-border);
  }

  .field {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }
  }
}

.code-editor {
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

.code-editor:hover {
  background: var(--surface-hover);
}

.code-editor:focus {
  background: var(--surface-hover);
  box-shadow: var(--focus-ring);
}

.code-editor::placeholder {
  color: var(--text-color-secondary);
  opacity: 0.7;
}

.code-editor.p-invalid {
  border-color: var(--red-500);
}

.command-output {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 1rem;
  margin: 0;
  background: var(--surface-ground);
  color: var(--text-color);
  border-radius: var(--border-radius);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.helper-text {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>         