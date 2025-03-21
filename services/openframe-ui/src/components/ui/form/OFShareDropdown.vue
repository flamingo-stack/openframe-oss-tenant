<template>
  <div class="of-form-group">
    <label v-if="label" :for="id" class="of-form-label">{{ label }}</label>
    <div class="of-share-dropdown-container">
      <PrimeDropdown
        :id="id"
        :modelValue="modelValue"
        :options="options"
        :optionLabel="optionLabel"
        :optionValue="optionValue"
        :placeholder="placeholder"
        :disabled="typeof disabled === 'boolean' ? disabled : Boolean(disabled)"
        :filter="true"
        :class="['of-share-dropdown', { 'p-invalid': error }]"
        @update:modelValue="$emit('update:modelValue', $event)"
      />
    </div>
    <small v-if="error" class="p-error">{{ error }}</small>
    <small v-if="helperText" class="of-text-secondary of-text-sm">{{ helperText }}</small>
  </div>
</template>

<script setup lang="ts">
import PrimeDropdown from 'primevue/dropdown';

const props = defineProps({
  id: {
    type: String,
    default: () => `share-dropdown-${Math.random().toString(36).substring(2, 9)}`
  },
  modelValue: {
    type: [String, Number, Object, null],
    required: true,
    default: null
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
    default: 'Select an option'
  },
  disabled: {
    type: [Boolean, Object],
    default: false,
    validator: (value) => {
      // Convert any non-boolean value to boolean
      return true;
    }
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
.of-share-dropdown-container {
  position: relative;
  width: 100%;
}

.of-share-dropdown {
  width: 100%;
  height: 42px;
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
}

.of-share-dropdown:not(.p-disabled).p-focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.of-share-dropdown .p-dropdown-label {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
}

.of-share-dropdown .p-dropdown-trigger {
  width: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Custom styling for dropdown panel */
:deep(.p-dropdown-panel) {
  background: var(--surface-card) !important;
  border: 1px solid var(--surface-border) !important;
  border-radius: 6px !important;
  margin-top: 4px !important;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12) !important;
}

:deep(.p-dropdown-panel .p-dropdown-header) {
  padding: 0.75rem !important;
  border-bottom: 1px solid var(--surface-border) !important;
  background: var(--surface-card) !important;
  margin: 0 !important;
}

:deep(.p-dropdown-panel .p-dropdown-header .p-dropdown-filter-container) {
  position: relative !important;
  margin: 0 !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  height: 42px !important;
}

:deep(.p-dropdown-panel .p-dropdown-header .p-dropdown-filter) {
  height: 42px !important;
  width: 100% !important;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem !important;
  background: var(--surface-section) !important;
  font-size: 0.875rem !important;
  border: 1px solid var(--surface-border) !important;
  border-radius: 6px !important;
  color: var(--text-color) !important;
  margin: 0 !important;
}

:deep(.p-dropdown-panel .p-dropdown-header .p-dropdown-filter-icon) {
  left: 0.75rem !important;
  color: var(--text-color-secondary) !important;
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  font-size: 1rem !important;
  margin: 0 !important;
  z-index: 5 !important;
}

:deep(.p-dropdown-panel .p-dropdown-items) {
  padding: 0.5rem 0 !important;
  background: var(--surface-card) !important;
  margin: 0 !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  padding: 0.75rem 1rem !important;
  color: var(--text-color) !important;
  background: transparent !important;
  transition: background-color 0.2s !important;
  font-size: 0.875rem !important;
  border-radius: 0 !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item:hover) {
  background: var(--surface-hover) !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item.p-highlight) {
  background: var(--surface-hover) !important;
  color: var(--text-color) !important;
  font-weight: 500 !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-empty-message) {
  padding: 0.75rem 1rem !important;
  color: var(--text-color-secondary) !important;
  font-size: 0.875rem !important;
}

.of-text-sm {
  font-size: 0.875rem;
}
</style>
