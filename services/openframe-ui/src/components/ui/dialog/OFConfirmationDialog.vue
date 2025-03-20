<template>
  <OFDialog
    :modelValue="modelValue" 
    @update:modelValue="$emit('update:modelValue', $event)"
    :header="header"
    :width="width"
  >
    <div class="of-confirmation-content">
      <i :class="icon" style="font-size: 2rem" class="mr-3" />
      <span v-if="message">{{ message }}</span>
      <slot></slot>
    </div>
    
    <template #footer>
      <div class="of-dialog-footer">
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
    default: 'Confirm'
  },
  message: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '450px'
  },
  icon: {
    type: String,
    default: 'pi pi-exclamation-triangle'
  },
  cancelLabel: {
    type: String,
    default: 'No'
  },
  confirmLabel: {
    type: String,
    default: 'Yes'
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
.of-confirmation-content {
  display: flex;
  align-items: center;
  padding: 1rem;
}
</style>
