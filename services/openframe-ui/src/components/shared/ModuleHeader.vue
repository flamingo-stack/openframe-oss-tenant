<template>
  <div class="flex justify-between items-center mb-6 p-4 bg-surface-card border-b border-surface-border">
    <div>
      <h1 class="text-xl font-semibold text-primary m-0">{{ title }}</h1>
      <p v-if="$slots.subtitle" class="text-secondary text-sm mt-1 mb-0">
        <slot name="subtitle" />
      </p>
    </div>
    <div class="flex gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script> 