<template>
  <div :class="['of-stat-card', { 'has-icon': !!icon }]">
    <div class="of-stat-content">
      <span class="of-stat-value" :class="valueClass">{{ value }}</span>
      <span class="of-stat-label">{{ label }}</span>
    </div>
    <div v-if="icon" class="of-stat-icon" :class="iconVariant">
      <i :class="icon"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  value: {
    type: [String, Number],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  valueClass: {
    type: String,
    default: ''
  },
  iconVariant: {
    type: String,
    default: '', // 'success', 'danger', 'warning'
    validator: (value: string) => ['', 'success', 'danger', 'warning', 'info'].includes(value)
  }
});
</script>

<style>
.of-stat-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--surface-border);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  height: 100%;
}

.of-stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.of-stat-value {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1;
}

.of-stat-value.success {
  color: var(--green-500);
}

.of-stat-value.danger {
  color: var(--red-500);
}

.of-stat-value.warning {
  color: var(--yellow-500);
}

.of-stat-label {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.of-stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--border-radius);
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.of-stat-icon.success {
  background: var(--green-500);
}

.of-stat-icon.danger {
  background: var(--red-500);
}

.of-stat-icon.warning {
  background: var(--yellow-500);
}
</style>
