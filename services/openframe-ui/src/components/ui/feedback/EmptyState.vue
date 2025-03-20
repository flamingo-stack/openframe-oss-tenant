<template>
  <div class="of-empty-state">
    <i :class="icon" class="of-empty-icon"></i>
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
    <p v-if="hint" class="of-hint">{{ hint }}</p>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: 'pi pi-info-circle'
  },
  title: {
    type: String,
    default: 'No Items Found'
  },
  message: {
    type: String,
    default: 'No items are available.'
  },
  hint: {
    type: String,
    default: ''
  }
});
</script>

<style>
.of-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.of-empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.of-empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.of-empty-state p {
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.of-empty-state .of-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}
</style>
