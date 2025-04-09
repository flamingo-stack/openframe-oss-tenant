<template>
  <div class="simple-dropdown">
    <button @click="toggle" class="dropdown-trigger">
      {{ modelValue }} <i class="pi pi-chevron-down"></i>
    </button>
    <div v-if="isOpen" class="dropdown-panel">
      <div 
        v-for="option in options" 
        :key="option"
        class="dropdown-item"
        :class="{ 'selected': option === modelValue }"
        @click="select(option)"
      >
        {{ option }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: number,
  options: number[]
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>();

const isOpen = ref(false);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const select = (value: number) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

// Close dropdown when clicking outside
const closeOnClickOutside = (e: MouseEvent) => {
  if (!e.target) return;
  if (!(e.target as Element).closest('.simple-dropdown')) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeOnClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', closeOnClickOutside);
});
</script>

<style scoped>
.simple-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  background: var(--surface-card);
  cursor: pointer;
  min-width: 4rem;
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 100%;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--surface-hover);
}

.dropdown-item.selected {
  color: var(--primary-color);
}
</style> 