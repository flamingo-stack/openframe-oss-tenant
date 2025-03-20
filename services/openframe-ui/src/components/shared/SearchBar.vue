<template>
  <div class="w-full max-w-md mb-4">
    <div class="p-inputgroup shadow-card">
      <span class="p-inputgroup-addon">
        <i class="pi pi-search"></i>
      </span>
      <InputText 
        :value="modelValue"
        :placeholder="placeholder"
        @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
        class="w-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { InputText } from '../../components/ui';

defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script> 