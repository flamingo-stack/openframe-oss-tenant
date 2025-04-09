<template>
  <div class="of-module-layout">
    <div class="of-module-header">
      <div>
        <h1 class="of-title">{{ title }}</h1>
        <p v-if="subtitle" class="of-text-secondary">{{ subtitle }}</p>
      </div>
      <div class="of-module-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="of-module-content">
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

<style>
.of-module-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-ground);
}

.of-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--of-spacing-lg);
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.of-module-actions {
  display: flex;
  gap: var(--of-spacing-sm);
}

.of-module-content {
  flex: 1;
  padding: var(--of-spacing-lg);
  overflow: auto;
}
</style>
