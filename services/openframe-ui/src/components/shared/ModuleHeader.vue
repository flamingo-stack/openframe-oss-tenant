<template>
  <div class="module-header">
    <h1 class="module-title">{{ title }}</h1>
    <div class="module-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  background: var(--surface-ground);
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

:deep(.p-button.p-button-primary) {
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;

  &:enabled:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.4);
  }

  .pi {
    font-size: 1rem;
    margin-right: 0.5rem;
  }
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem 2rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.module-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.module-actions {
  display: flex;
  gap: 0.5rem;
}
</style> 