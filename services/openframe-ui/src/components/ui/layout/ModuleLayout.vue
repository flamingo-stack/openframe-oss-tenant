<template>
  <div class="of-module-layout flex flex-col h-full bg-surface-ground">
    <div class="of-module-header flex items-center justify-between p-6 bg-surface-card border-b border-surface-border">
      <div>
        <h1 class="text-2xl font-semibold text-primary m-0">{{ title }}</h1>
        <p v-if="subtitle" class="text-secondary text-sm mt-1 mb-0">{{ subtitle }}</p>
      </div>
      <div class="of-module-actions flex gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div class="of-module-content flex-1 p-6 overflow-auto">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
});
</script>
