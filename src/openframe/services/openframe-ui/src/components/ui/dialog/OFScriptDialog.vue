<template>
  <OFDialog
    :modelValue="modelValue" 
    @update:modelValue="$emit('update:modelValue', $event)"
    :header="header"
    :width="width"
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
            v-if="showConfirm"
            :label="confirmLabel" 
            :icon="confirmIcon" 
            class="p-button-primary" 
            @click="$emit('confirm')"
            :loading="loading"
          />
        </slot>
      </div>
    </template>
  </OFDialog>
</template>

<script setup lang="ts">
import OFDialog from './OFDialog.vue';
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
  },
  showConfirm: {
    type: Boolean,
    default: true
  }
});

defineEmits(['update:modelValue', 'confirm', 'cancel']);
</script>
