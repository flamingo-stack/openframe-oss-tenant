<template>
  <div class="of-search-bar">
    <div class="p-inputgroup">
      <span class="p-inputgroup-addon">
        <i class="pi pi-search"></i>
      </span>
      <InputText 
        :value="modelValue"
        :placeholder="placeholder"
        @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
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

<style>
.of-search-bar {
  width: 30rem;
  margin-right: auto;
  margin-bottom: var(--of-spacing-md, 1rem);
}

.of-search-bar .p-inputgroup {
  box-shadow: var(--card-shadow);
}
</style>       