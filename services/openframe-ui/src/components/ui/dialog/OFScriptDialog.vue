<template>
  <Dialog 
    :visible="modelValue" 
    @update:visible="(val) => $emit('update:modelValue', val)"
    :style="{ width: width }" 
    :header="header" 
    :modal="true"
    class="of-dialog"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <slot></slot>
    
    <template #footer>
      <div class="of-dialog-footer">
        <slot name="footer">
          <OFButton 
            :label="cancelLabel" 
            icon="pi pi-times" 
            class="p-button-text" 
            @click="$emit('cancel')"
          />
          <OFButton 
            :label="confirmLabel" 
            :icon="confirmIcon" 
            class="p-button-primary" 
            @click="$emit('confirm')"
            :loading="loading"
          />
        </slot>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import { OFButton } from '../index';

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  header: {
    type: String,
    default: 'Dialog'
  },
  width: {
    type: String,
    default: '500px'
  },
  cancelLabel: {
    type: String,
    default: 'Cancel'
  },
  confirmLabel: {
    type: String,
    default: 'Confirm'
  },
  confirmIcon: {
    type: String,
    default: 'pi pi-check'
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:modelValue', 'confirm', 'cancel']);
</script>

<style>
.of-dialog .p-dialog-header {
  background: var(--surface-section);
  color: var(--text-color);
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.of-dialog .p-dialog-content {
  background: var(--surface-section);
  color: var(--text-color);
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}

.of-dialog .p-dialog-footer {
  background: var(--surface-section);
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.of-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
