<template>
  <div class="of-search-bar">
    <div class="p-inputgroup">
      <span class="p-inputgroup-addon">
        <i class="pi pi-search"></i>
      </span>
      <InputText 
        :value="modelValue || ''"
        :placeholder="placeholder"
        @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { InputText } from '../../components/ui';

defineProps<{
  modelValue: string | null;
  placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue', 'search'])

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    emit('search')
  }
}
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