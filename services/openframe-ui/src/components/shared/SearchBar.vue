<template>
  <div class="search-bar">
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
import InputText from 'primevue/inputtext';

defineProps<{
  modelValue: string;
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

<style scoped>
.search-bar {
  width: 100%;
  height: 100%;
}

:deep(.p-inputgroup) {
  height: 100%;
  background: var(--surface-section);
  border-radius: 6px;
  box-shadow: none;
}

:deep(.p-inputgroup-addon) {
  background: var(--surface-section);
  border: none;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-inputgroup .p-inputtext) {
  background: var(--surface-section);
  border: none;
  padding: 0.75rem 1rem;
  height: 100%;
}

:deep(.p-inputgroup .p-inputtext:focus) {
  box-shadow: none;
  border: none;
  outline: none;
}

:deep(.p-inputgroup-addon:first-child) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

:deep(.p-inputgroup .p-inputtext:last-child) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style> 