<template>
  <div class="of-card" :class="{ 'of-card--no-padding': noPadding }">
    <div v-if="title || $slots.header" class="of-card__header">
      <h3 v-if="title" class="of-card__title">{{ title }}</h3>
      <slot name="header"></slot>
    </div>
    <div class="of-card__body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="of-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: ''
  },
  noPadding: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.of-card {
  background-color: var(--surface-card);
  border-radius: 8px;
  box-shadow: var(--shadow, 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06));
  margin-bottom: 16px;
  overflow: hidden;
}

.of-card__header {
  padding: 16px;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.of-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.of-card__body {
  padding: 16px;
}

.of-card--no-padding .of-card__body {
  padding: 0;
}

.of-card__footer {
  padding: 16px;
  border-top: 1px solid var(--surface-border);
}

@media screen and (max-width: 768px) {
  .of-card__header,
  .of-card__body,
  .of-card__footer {
    padding: 12px;
  }
}
</style> 