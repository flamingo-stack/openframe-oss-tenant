<template>
  <OFScriptDialog
    :modelValue="modelValue" 
    @update:modelValue="(val) => $emit('update:modelValue', val)"
    :header="header"
    :width="width"
    :cancelLabel="cancelLabel"
    :confirmLabel="confirmLabel"
    :confirmIcon="confirmIcon"
    :loading="loading"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <div class="of-confirmation-content">
      <i :class="icon" style="font-size: 2rem" class="mr-3" />
      <span v-if="message">{{ message }}</span>
      <slot></slot>
    </div>
  </OFScriptDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import OFScriptDialog from './OFScriptDialog.vue';

const props = defineProps({
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
