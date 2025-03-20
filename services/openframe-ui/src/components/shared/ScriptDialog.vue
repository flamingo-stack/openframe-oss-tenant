<template>
  <Dialog 
    :visible="visible"
    @update:visible="(val: boolean) => emit('update:visible', val)"
    :header="isEditMode ? 'Edit Script' : 'View Script'"
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
        <!-- Basic Information Group -->
        <div class="dialog-section">
          <h3 class="section-title">Basic Information</h3>
          <div class="section-content">
            <div class="field">
              <label for="name">Name</label>
              <InputText 
                id="name" 
                v-model="script.name" 
                required 
                autofocus 
                placeholder="Enter script name"
                :class="{ 'p-invalid': submitted && !script.name }"
                :disabled="!isEditMode"
              />
              <small class="p-error" v-if="submitted && !script.name">
                Name is required.
              </small>
            </div>

            <div class="field">
              <label for="description">Description</label>
              <Textarea 
                id="description" 
                v-model="script.description" 
                required 
                placeholder="Enter script description"
                :class="{ 'p-invalid': submitted && !script.description }"
                rows="2"
                :disabled="!isEditMode"
              />
              <small class="p-error" v-if="submitted && !script.description">
                Description is required.
              </small>
            </div>

            <div class="field">
              <label for="category">Category</label>
              <Dropdown
                id="category"
                v-model="script.category"
                :options="[]"
                optionLabel="name"
                optionValue="value"
                placeholder="Select category"
                filter
                :disabled="!isEditMode"
              />
            </div>
          </div>
        </div>

        <!-- Script Configuration Group -->
        <div class="dialog-section">
          <h3 class="section-title">Script Configuration</h3>
          <div class="section-content">
            <div class="field">
              <label for="shell">Script Type</label>
              <Dropdown
                id="shell"
                v-model="script.shell"
                :options="shellOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select script type"
                :class="{ 'p-invalid': submitted && !script.shell }"
                :disabled="!isEditMode"
              />
              <small class="p-error" v-if="submitted && !script.shell">
                Script type is required.
              </small>
            </div>

            <div class="field">
              <label for="platforms">Supported Platforms</label>
              <MultiSelect
                id="platforms"
                v-model="script.supported_platforms"
                :options="platformOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select supported platforms"
                :class="{ 'p-invalid': submitted && !script.supported_platforms.length }"
                class="w-full"
                :disabled="!isEditMode"
              />
              <small class="p-error" v-if="submitted && !script.supported_platforms.length">
                At least one platform is required.
              </small>
            </div>

            <div class="field">
              <label for="syntax">Script Content</label>
              <div class="command-input-container">
                <ScriptEditor 
                  id="syntax" 
                  v-model="script.syntax" 
                  :rows="6"
                  placeholder="Enter script content"
                  :class="{ 'p-invalid': submitted && !script.syntax }"
                  :disabled="!isEditMode"
                />
                <small class="p-error" v-if="submitted && !script.syntax">
                  Script content is required.
                </small>
              </div>
            </div>

            <div class="field">
              <label for="timeout">Timeout (seconds)</label>
              <InputNumber
                id="timeout"
                v-model="script.default_timeout"
                :min="1"
                :max="3600"
                class="w-full"
                :disabled="!isEditMode"
              />
            </div>

            <div class="field-checkbox">
              <Checkbox
                id="run_as_user"
                v-model="script.run_as_user"
                :binary="true"
                :disabled="!isEditMode"
              />
              <label for="run_as_user" class="ml-2">Run As User (Windows only)</label>
            </div>
          </div>
        </div>

        <!-- Script Parameters Group -->
        <div class="dialog-section">
          <h3 class="section-title">Script Parameters</h3>
          <div class="section-content">
            <div class="field">
              <label for="args">Script Arguments</label>
              <div class="recipients-list">
                <div v-for="(arg, index) in script.args" :key="index" class="recipient-item">
                  <div class="recipient-input-group">
                    <InputText
                      v-model="script.args[index]"
                      placeholder="Enter argument"
                      class="recipient-input"
                      @keyup.enter="addArg"
                      @keydown.enter.prevent
                      :disabled="!isEditMode"
                    />
                    <small class="recipient-hint">Press Enter to add another argument</small>
                  </div>
                  <Button
                    icon="pi pi-trash"
                    class="p-button-text p-button-sm p-button-danger"
                    @click="removeArg(index)"
                    v-tooltip.top="'Remove argument'"
                    :disabled="!isEditMode"
                  />
                </div>
                <div class="recipient-actions">
                  <Button
                    label="Add Argument"
                    icon="pi pi-plus"
                    class="p-button-text"
                    @click="addArg"
                    :disabled="!isEditMode"
                  />
                  <small class="recipient-hint">Arguments will be passed to the script in order</small>
                </div>
              </div>
            </div>

            <div class="field">
              <label for="env_vars">Environment Variables</label>
              <div class="recipients-list">
                <div v-for="(_, index) in envVarKeys" :key="index" class="recipient-item">
                  <div class="recipient-input-group">
                    <div class="env-var-inputs">
                      <InputText
                        v-model="envVarKeys[index]"
                        placeholder="Key"
                        class="env-var-key"
                        @keyup.enter="addEnvVar"
                        @keydown.enter.prevent
                        :disabled="!isEditMode"
                      />
                      <span class="env-var-separator">=</span>
                      <InputText
                        v-model="envVarValues[index]"
                        placeholder="Value"
                        class="env-var-value"
                        @keyup.enter="addEnvVar"
                        @keydown.enter.prevent
                        :disabled="!isEditMode"
                      />
                    </div>
                    <small class="recipient-hint">Press Enter to add another variable</small>
                  </div>
                  <Button
                    icon="pi pi-trash"
                    class="p-button-text p-button-sm p-button-danger"
                    @click="removeEnvVar(index)"
                    v-tooltip.top="'Remove environment variable'"
                    :disabled="!isEditMode"
                  />
                </div>
                <div class="recipient-actions">
                  <Button
                    label="Add Environment Variable"
                    icon="pi pi-plus"
                    class="p-button-text"
                    @click="addEnvVar"
                    :disabled="!isEditMode"
                  />
                  <small class="recipient-hint">Format: KEY=VALUE</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button 
          label="Close" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="onCancel"
        />
        <Button 
          v-if="isEditMode && props.scriptType === 'userdefined'"
          label="Update" 
          icon="pi pi-check" 
          class="p-button-primary" 
          @click="onSave" 
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { computed, watch } from '@vue/runtime-core';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import { ToastService } from '../../services/ToastService';
import ScriptEditor from '../ui/form/ScriptEditor.vue';

const toastService = ToastService.getInstance();

type SupportedPlatform = 'windows' | 'linux' | 'darwin';

interface ScriptForm {
  name: string;
  description: string;
  shell: string | null;
  supported_platforms: SupportedPlatform[];
  category: string | null;
  args: string[];
  env_vars: string[];
  default_timeout: number;
  run_as_user: boolean;
  syntax: string;
}

const props = defineProps<{
  visible: boolean;
  isEditMode: boolean;
  loading: boolean;
  initialScript?: ScriptForm;
  scriptType?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'save', script: ScriptForm): void;
  (e: 'cancel'): void;
}>();

const script = ref<ScriptForm>({
  name: '',
  description: '',
  shell: null,
  supported_platforms: [],
  category: null,
  args: [],
  env_vars: [],
  default_timeout: 90,
  run_as_user: false,
  syntax: ''
});

const submitted = ref(false);

const shellOptions = [
  { label: 'Shell', value: 'shell' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Batch', value: 'batch' },
  { label: 'Python', value: 'python' }
];

const platformOptions = [
  { label: 'Windows', value: 'windows' as SupportedPlatform },
  { label: 'Linux', value: 'linux' as SupportedPlatform },
  { label: 'macOS', value: 'darwin' as SupportedPlatform }
];

const envVarKeys = ref<string[]>(['']);
const envVarValues = ref<string[]>(['']);

const validatePlatforms = (platforms: unknown): platforms is SupportedPlatform[] => {
  if (!Array.isArray(platforms)) {
    return false;
  }
  const validPlatforms = ['windows', 'linux', 'darwin'] as const;
  return platforms.every(platform => validPlatforms.includes(platform as SupportedPlatform));
};

watch(() => props.initialScript, (newValue: ScriptForm | undefined) => {
  if (newValue) {
    script.value = { ...newValue };
    if (!validatePlatforms(script.value.supported_platforms)) {
      script.value.supported_platforms = [];
    }
    const envVars = newValue.env_vars || [];
    envVarKeys.value = envVars.map(v => v.split('=')[0] || '');
    envVarValues.value = envVars.map(v => v.split('=')[1] || '');
    if (envVarKeys.value.length === 0) {
      envVarKeys.value = [''];
      envVarValues.value = [''];
    }
  }
}, { immediate: true });

watch(() => props.visible, (newValue: boolean) => {
  if (!newValue) {
    resetForm();
  }
});

const onSave = () => {
  submitted.value = true;

  if (!script.value.name || !script.value.shell || 
      !script.value.description || !script.value.syntax ||
      !script.value.supported_platforms.length) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  if (!validatePlatforms(script.value.supported_platforms)) {
    toastService.showError('Invalid platform selection');
    return;
  }

  script.value.env_vars = envVarKeys.value
    .map((key, index) => {
      const value = envVarValues.value[index] || '';
      return key ? `${key}=${value}` : '';
    })
    .filter(Boolean);

  emit('save', script.value);
};

const onCancel = () => {
  emit('update:visible', false);
  emit('cancel');
  resetForm();
};

const resetForm = () => {
  script.value = {
    name: '',
    description: '',
    shell: null,
    supported_platforms: [],
    category: null,
    args: [],
    env_vars: [],
    default_timeout: 90,
    run_as_user: false,
    syntax: ''
  };
  envVarKeys.value = [''];
  envVarValues.value = [''];
  submitted.value = false;
};

const addArg = () => {
  script.value.args.push('');
};

const removeArg = (index: number) => {
  script.value.args.splice(index, 1);
};

const addEnvVar = () => {
  const lastIndex = envVarKeys.value.length - 1;
  if (envVarKeys.value[lastIndex] || envVarValues.value[lastIndex]) {
    envVarKeys.value.push('');
    envVarValues.value.push('');
  }
};

const removeEnvVar = (index: number) => {
  envVarKeys.value.splice(index, 1);
  envVarValues.value.splice(index, 1);
  if (envVarKeys.value.length === 0) {
    envVarKeys.value = [''];
    envVarValues.value = [''];
  }
};
</script>

<style>
:deep(.p-dialog-mask) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.p-dialog) {
  margin: 0 auto !important;
}

:deep(.p-dialog-content) {
  overflow-y: auto !important;
  max-height: calc(90vh - 120px) !important;
}

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

  .field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .p-inputtext,
  .p-dropdown,
  .p-multiselect,
  .p-inputnumber {
    width: 100%;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    transition: all 0.2s;

    &:hover {
      border-color: var(--primary-color);
    }

    &:focus,
    &.p-focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }

    &.p-invalid {
      border-color: var(--red-500);
    }
  }

  .font-mono {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  }
}

.recipients-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recipient-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.recipient-input {
  flex: 1;
}

.command-input-container {
  position: relative;
  width: 100%;
}

.command-input {
  width: 100%;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 150px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-color);
  }

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  &.p-invalid {
    border-color: var(--red-500);
  }
}

.recipient-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recipient-hint {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}

.recipient-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.env-var-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.env-var-key {
  flex: 1;
}

.env-var-value {
  flex: 2;
}

.env-var-separator {
  color: var(--text-color-secondary);
  font-weight: bold;
}

.dialog-section {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--card-shadow);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style> 