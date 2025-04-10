<template>
  <div 
    class="of-code-block" 
    :class="{ 'error': error, 'of-code-block-sm': size === 'small' }"
  >
    <slot>
      <code v-if="inline">{{ content }}</code>
      <pre v-else>{{ content }}</pre>
    </slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  content: {
    type: String,
    default: ''
  },
  error: {
    type: Boolean,
    default: false
  },
  inline: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  }
});
</script>

<style>
.of-code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  transition: all 0.2s;
}

.of-code-block-sm {
  padding: 0.5rem;
}

.of-code-block code, 
.of-code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--font-family-monospace, monospace);
  font-size: 0.875rem;
  color: var(--text-color);
}

.of-code-block.error {
  background: var(--surface-ground);
  border-color: var(--red-100);
}
</style>
