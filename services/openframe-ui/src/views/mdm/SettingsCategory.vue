<template>
  <div class="settings-content">
    <template v-if="category && config && config[category]">
      <section class="mb-4">
        <h2>{{ formatKey(category) }}</h2>
        <div class="grid">
          <template v-if="typeof config[category] === 'object' && config[category] !== null">
            <!-- Non-Boolean fields (half row) -->
            <template v-for="(subValue, subKey) in nonBooleanFields" :key="subKey">
              <div class="col-12 md:col-12 xl:col-6 mb-3">
                <div class="tool-card" :class="{ 'non-editable': !isPropertyEditable(subKey, category) }">
                  <div class="tool-header">
                    <div class="tool-header-left">
                      <h3>{{ formatKey(subKey) }}</h3>
                    </div>
                    <div class="tool-header-right">
                      <div class="save-button-wrapper">
                        <Button v-if="hasPropertyChanges(category, subKey)"
                          icon="pi pi-save"
                          class="p-button-text p-button-sm save-button"
                          @click="handleSave(category, subKey)"
                          :loading="isSaving(category, subKey)"
                        />
                      </div>
                      <div class="tool-tags">
                        <template v-if="!isPropertyEditable(subKey, category)">
                          <Tag value="Read Only" 
                               severity="warning" 
                               class="tool-tag" />
                          <Tag :value="getValueType(subValue, category, subKey)" 
                               :severity="getTagSeverity(subValue, getValueType(subValue, category, subKey))" 
                               class="tool-tag" />
                        </template>
                        <template v-else>
                          <Tag :value="getValueType(subValue, category, subKey)" 
                               :severity="getTagSeverity(subValue, getValueType(subValue, category, subKey))" 
                               class="tool-tag" />
                        </template>
                      </div>
                    </div>
                  </div>
                  <div class="tool-content">
                    <template v-if="typeof subValue === 'object' && subValue !== null">
                      <div class="nested-object-wrapper">
                        <NestedObjectEditor
                          v-if="!Array.isArray(subValue)"
                          :value="subValue"
                          :isEditable="isPropertyEditable(subKey, category)"
                          @update:value="val => updateConfigValue(category, subKey, val)"
                          @error="handleNestedError"
                        />
                        <div v-else class="array-value">
                          <Chips
                            :modelValue="getConfigValue(category, subKey)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                            @update:modelValue="val => updateConfigValue(category, subKey, val)"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="edit-field">
                        <template v-if="typeof subValue === 'boolean'">
                          <InputSwitch
                            :modelValue="getConfigValue(category, subKey) as boolean"
                            @update:modelValue="val => updateConfigValue(category, subKey, val)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="settings-switch"
                          />
                        </template>
                        <template v-else-if="typeof subValue === 'number'">
                          <InputNumber
                            :modelValue="getConfigValue(category, subKey) as number"
                            @update:modelValue="val => updateConfigValue(category, subKey, val ?? null)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                            :showButtons="false"
                            :useGrouping="false"
                            @input="event => updateConfigValue(category, subKey, event.value ?? null)"
                          />
                        </template>
                        <template v-else>
                          <InputText
                            :modelValue="String(getConfigValue(category, subKey) ?? '')"
                            @update:modelValue="val => updateConfigValue(category, subKey, val || null)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                          />
                        </template>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- Boolean fields (third row) -->
            <template v-for="(subValue, subKey) in booleanFields" :key="subKey">
              <div class="col-12 md:col-4 xl:col-4 mb-3">
                <div class="tool-card" :class="{ 'non-editable': !isPropertyEditable(subKey, category) }">
                  <div class="tool-header">
                    <div class="tool-header-left">
                      <h3>{{ formatKey(subKey) }}</h3>
                    </div>
                    <div class="tool-header-right">
                      <div class="save-button-wrapper">
                        <Button v-if="hasPropertyChanges(category, subKey)"
                          icon="pi pi-save"
                          class="p-button-text p-button-sm save-button"
                          @click="handleSave(category, subKey)"
                          :loading="isSaving(category, subKey)"
                        />
                      </div>
                      <div class="tool-tags">
                        <template v-if="!isPropertyEditable(subKey, category)">
                          <Tag value="Read Only" 
                               severity="warning" 
                               class="tool-tag" />
                          <Tag :value="getValueType(subValue, category, subKey)" 
                               :severity="getTagSeverity(subValue, getValueType(subValue, category, subKey))" 
                               class="tool-tag" />
                        </template>
                        <template v-else>
                          <Tag :value="getValueType(subValue, category, subKey)" 
                               :severity="getTagSeverity(subValue, getValueType(subValue, category, subKey))" 
                               class="tool-tag" />
                        </template>
                      </div>
                    </div>
                  </div>
                  <div class="tool-content">
                    <template v-if="typeof subValue === 'object' && subValue !== null">
                      <div class="nested-object-wrapper">
                        <NestedObjectEditor
                          v-if="!Array.isArray(subValue)"
                          :value="subValue"
                          :isEditable="isPropertyEditable(subKey, category)"
                          @update:value="val => updateConfigValue(category, subKey, val)"
                          @error="handleNestedError"
                        />
                        <div v-else class="array-value">
                          <Chips
                            :modelValue="getConfigValue(category, subKey)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                            @update:modelValue="val => updateConfigValue(category, subKey, val)"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="edit-field">
                        <template v-if="typeof subValue === 'boolean'">
                          <InputSwitch
                            :modelValue="getConfigValue(category, subKey) as boolean"
                            @update:modelValue="val => updateConfigValue(category, subKey, val)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="settings-switch"
                          />
                        </template>
                        <template v-else-if="typeof subValue === 'number'">
                          <InputNumber
                            :modelValue="getConfigValue(category, subKey) as number"
                            @update:modelValue="val => updateConfigValue(category, subKey, val ?? null)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                            :showButtons="false"
                            :useGrouping="false"
                            @input="event => updateConfigValue(category, subKey, event.value ?? null)"
                          />
                        </template>
                        <template v-else>
                          <InputText
                            :modelValue="String(getConfigValue(category, subKey) ?? '')"
                            @update:modelValue="val => updateConfigValue(category, subKey, val || null)"
                            :disabled="!isPropertyEditable(subKey, category)"
                            class="w-full"
                          />
                        </template>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import Chips from 'primevue/chips';
import NestedObjectEditor from '../../components/NestedObjectEditor.vue';
import { ToastService } from '../../services/ToastService';
import type { EditableValue } from './Settings.vue';
import Textarea from 'primevue/textarea';

const props = defineProps<{
  config: Record<string, any>;
  formatKey: (key: string) => string;
  isPropertyEditable: (key: string, parentKey?: string) => boolean;
  getValueType: (value: any, parentKey?: string, key?: string) => string;
  getTagSeverity: (value: any, type?: string) => string;
  getConfigValue: (key: string, subKey: string | null) => any;
  updateConfigValue: (key: string, subKey: string | null, value: any) => void;
  hasPropertyChanges: (key: string, subKey: string | null) => boolean;
  isSaving: (key: string, subKey: string | null) => boolean;
  saveConfigProperty: (key: string, subKey: string | null, value: any) => Promise<void>;
  fetchMDMConfig: () => Promise<void>;
  editedConfig: { value: Record<string, any> };
  changedValues: { value: Record<string, any> };
  hasChanges: boolean;
}>();

const route = useRoute();
const category = computed(() => route.params.category as string);

const nonBooleanFields = computed(() => {
  if (!props.config || !category.value) return {};
  return Object.entries(props.config[category.value])
    .filter(([_, val]) => props.getValueType(val, category.value) !== 'Boolean')
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
});

const booleanFields = computed(() => {
  if (!props.config || !category.value) return {};
  return Object.entries(props.config[category.value])
    .filter(([_, val]) => props.getValueType(val, category.value) === 'Boolean')
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
});

const toastService = ToastService.getInstance();

const addArrayItem = (category: string, subKey: string | undefined) => {
  if (!subKey) return;
  const currentValue = props.getConfigValue(category, subKey) || [];
  props.updateConfigValue(category, subKey, [...currentValue, '']);
};

const removeArrayItem = (category: string, subKey: string | undefined, index: number) => {
  if (!subKey) return;
  const currentValue = props.getConfigValue(category, subKey) || [];
  const newValue = [...currentValue];
  newValue.splice(index, 1);
  props.updateConfigValue(category, subKey, newValue);
};

const updateArrayItem = (category: string, subKey: string | undefined, index: number, value: string) => {
  if (!subKey) return;
  const currentValue = props.getConfigValue(category, subKey) || [];
  const newValue = [...currentValue];
  newValue[index] = value;
  props.updateConfigValue(category, subKey, newValue);
};

const handleNestedError = (error: string) => {
  toastService.showError(error);
};

const handleSave = async (category: string, subKey: string | null) => {
  try {
    console.log('🔄 [MDM] Starting handleSave:', { category, subKey });
    
    // Get the value from editedConfig if it exists, otherwise fall back to config
    const value = subKey 
      ? (props.editedConfig?.value?.[category]?.[subKey] ?? props.config?.[category]?.[subKey])
      : (props.editedConfig?.value?.[category] ?? props.config?.[category]);

    console.log('📦 [MDM] Value to save:', value);

    if (value === undefined) {
      throw new Error(`No value found for ${category}${subKey ? `.${subKey}` : ''}`);
    }

    // Call saveConfigProperty with all three arguments
    await props.saveConfigProperty(category, subKey, value);
    console.log('✅ [MDM] handleSave completed successfully');
  } catch (err: any) {
    console.error('❌ [MDM] Error in handleSave:', err);
    console.error('Error details:', {
      message: err.message,
      response: err.response,
      stack: err.stack
    });
    
    // Show error toast
    toastService.showError(err.response?.data?.message || err.message || 'Failed to update setting');
    
    // Revert the value in editedConfig if it exists
    if (props.editedConfig?.value) {
      if (subKey) {
        props.editedConfig.value[category] = props.editedConfig.value[category] || {};
        props.editedConfig.value[category][subKey] = props.config[category][subKey];
      } else {
        props.editedConfig.value[category] = props.config[category];
      }
    }
  }
};

const getDisplayValue = (value: EditableValue): string => {
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  return String(value ?? '');
};
</script>

<style scoped>
.settings-content {
  flex: 1;
  height: 100%;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
}

.tool-card {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--card-shadow);
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.tool-header-left {
  flex: 1;
}

.tool-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.tool-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
}

.tool-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.tool-tag {
  font-size: 0.7rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.save-button-wrapper {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-button {
  opacity: 0;
  transition: opacity 0.2s ease;
  visibility: hidden;
}

.save-button:not([disabled]) {
  opacity: 1;
  visibility: visible;
}

.tool-content {
  flex: 1;
  margin-top: 0.5rem;
}

.edit-field {
  margin-top: 0.5rem;
}

.nested-object-wrapper {
  margin-top: 0.5rem;
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
}

.array-value {
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
  overflow: auto;
  max-height: 300px;
}

.array-value pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-family-monospace);
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.non-editable {
  opacity: 0.8;
  background: var(--surface-ground);
}

.non-editable .tool-content {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.p-inputswitch.p-disabled),
:deep(.p-inputtext.p-disabled),
:deep(.p-inputnumber.p-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.settings-switch) {
  .p-inputswitch {
    width: 3rem;
    height: 1.5rem;
  }

  .p-inputswitch .p-inputswitch-slider {
    background: var(--surface-300);
  }

  .p-inputswitch:not(.p-disabled):hover .p-inputswitch-slider {
    background: var(--surface-400);
  }

  .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider {
    background: var(--primary-color);
  }

  .p-inputswitch.p-inputswitch-checked:not(.p-disabled):hover .p-inputswitch-slider {
    background: var(--primary-600);
  }
}
</style> 