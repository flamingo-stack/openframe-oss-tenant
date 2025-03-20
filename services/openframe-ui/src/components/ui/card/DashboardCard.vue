<template>
  <div class="of-dashboard-card">
    <h3 v-if="title">
      <i v-if="icon" :class="icon"></i>
      {{ title }}
    </h3>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
});
</script>

<style>
.of-dashboard-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.of-dashboard-card > :not(h3) {
  flex: 1;
}

.of-dashboard-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.of-dashboard-card h3 i {
  color: var(--primary-color);
  opacity: 0.8;
}
</style>
