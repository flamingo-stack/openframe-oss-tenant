<template>
  <div class="nested-object">
    <template v-if="localValue && typeof localValue === 'object'">
      <div v-for="(val, key) in localValue" :key="key" class="nested-field">
        <div class="nested-field-label">{{ formatKey(key) }}</div>
        <div class="nested-field-value">
          <template v-if="getValueType(val) === 'Object'">
            <NestedObjectEditor
              :value="val"
              :isPropertyEditable="isPropertyEditable"
              :parentKey="parentKey"
              @update:value="newVal => updateValue(key, newVal)"
              @error="err => emit('error', err)"
            />
          </template>
          <template v-else-if="getValueType(val) === 'Array'">
            <div class="array-inputs">
              <div v-for="(item, index) in getArrayItems(val)" :key="'item-' + key + '-' + index" class="array-input-row">
                <InputText
                  :modelValue="item"
                  @update:modelValue="newVal => updateArrayItem(key, index, newVal)"
                  :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
                  class="w-full"
                />
                <OFButton
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
                  @click="removeArrayItem(key, index)"
                  v-tooltip.top="'Remove item'"
                />
              </div>
              <div class="add-item-wrapper">
                <OFButton
                  icon="pi pi-plus"
                  :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
                  @click="addArrayItem(key)"
                  class="p-button-text p-button-sm p-button-icon-only"
                  v-tooltip.top="'Add new item'"
                />
              </div>
            </div>
          </template>
          <template v-else-if="getValueType(val) === 'Boolean'">
            <div class="switch-wrapper">
              <InputSwitch
                :modelValue="val"
                @update:modelValue="newVal => updateValue(key, newVal)"
                :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
                class="settings-switch"
              />
            </div>
          </template>
          <template v-else-if="getValueType(val) === 'Number'">
            <InputNumber
              :modelValue="val"
              @update:modelValue="newVal => updateValue(key, newVal)"
              :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
              class="w-full"
            />
          </template>
          <template v-else>
            <InputText
              :modelValue="String(val ?? '')"
              @update:modelValue="newVal => updateValue(key, newVal || null)"
              :disabled="isPropertyEditable && !isPropertyEditable(key, parentKey)"
              class="w-full"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, toRaw, computed, ref } from 'vue';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import { OFButton } from '@/components/ui';
import NestedObjectEditor from './NestedObjectEditor.vue';

const props = defineProps<{
  value: Record<string | number, any>;
  isPropertyEditable?: (key: string | number, parentKey?: string | number) => boolean;
  parentKey?: string | number;
}>();

const emit = defineEmits(['update:value', 'error']);

const getValueType = (value: any): string => {
  if (Array.isArray(value)) return 'Array';
  if (typeof value === 'object' && value !== null) return 'Object';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return 'Number';
  return 'String';
};

const formatKey = (key: string | number): string => {
  return String(key)
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const localValue = ref<Record<string | number, any>>(toRaw(props.value));

const updateValue = (key: string | number, newValue: any) => {
  if (typeof localValue.value !== 'object') return;
  
  console.log('Updating value:', {
    key,
    oldValue: localValue.value[String(key)],
    newValue,
    isArray: Array.isArray(newValue)
  });
  
  localValue.value = {
    ...localValue.value,
    [String(key)]: Array.isArray(newValue) ? [...newValue] : newValue
  };
  
  emit('update:value', localValue.value);
};

const getArrayItems = (val: any) => {
  const rawVal = toRaw(val);
  return Array.isArray(rawVal) ? rawVal : [];
};

const addArrayItem = (key: string | number) => {
  const currentValue = getArrayItems(localValue.value[String(key)]);
  console.log('Current array value:', currentValue);
  
  const arrayValue = [...currentValue, ''];
  console.log('New array value:', arrayValue);
  updateValue(key, arrayValue);
};

const removeArrayItem = (key: string | number, index: number) => {
  const currentValue = getArrayItems(localValue.value[String(key)]);
  
  const updatedValue = currentValue.filter((_, i) => i !== index);
  console.log('After removing item:', {
    index,
    oldValue: currentValue,
    newValue: updatedValue,
    isArray: true
  });
  
  updateValue(key, updatedValue);
};

const updateArrayItem = (key: string | number, index: number, newValue: string | undefined) => {
  const currentValue = getArrayItems(localValue.value[String(key)]);
  
  const updatedValue = [...currentValue];
  updatedValue[index] = newValue || '';
  
  console.log('Updating array item:', {
    index,
    oldValue: currentValue[index],
    newValue: updatedValue[index],
    fullArray: updatedValue
  });
  
  updateValue(key, updatedValue);
};
</script>

<style scoped>
.nested-object {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nested-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nested-field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.nested-field-value {
  width: 100%;
}

.array-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.array-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.add-item-wrapper {
  margin-top: 0.5rem;
}

:deep(.p-button.p-button-icon-only) {
  width: 2rem;
  height: 2rem;
  padding: 0.5rem;

  &:enabled:hover {
    background: var(--surface-hover);
  }

  &:enabled:active {
    background: var(--surface-ground);
  }

  .p-button-icon {
    font-size: 1rem;
  }
}

.switch-wrapper {
  display: flex;
  align-items: center;
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
    background: var(--yellow-500);
  }

  .p-inputswitch.p-inputswitch-checked:not(.p-disabled):hover .p-inputswitch-slider {
    background: var(--yellow-600);
  }

  .p-inputswitch .p-inputswitch-slider:before {
    background: var(--surface-0);
    width: 1.25rem;
    height: 1.25rem;
    left: 0.125rem;
    margin-top: -0.625rem;
    border-radius: 50%;
    transition-duration: 0.2s;
  }

  .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider:before {
    transform: translateX(1.5rem);
  }
}

.array-item-enter-active,
.array-item-leave-active {
  transition: all 0.3s ease;
}

.array-item-enter-from,
.array-item-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.array-item-move {
  transition: transform 0.3s ease;
}
</style>  