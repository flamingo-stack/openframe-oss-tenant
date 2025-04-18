<template>
  <div class="of-module-header">
    <div>
      <h1 class="of-title">{{ title }}</h1>
      <p v-if="$slots.subtitle" class="of-text-secondary">
        <slot name="subtitle" />
      </p>
    </div>
    <div class="of-module-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style>
.of-module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem 2rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.of-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.of-text-secondary {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  margin-top: 0.25rem;
  margin-bottom: 0;
}

.of-module-actions {
  display: flex;
  gap: 0.5rem;
}
</style>     