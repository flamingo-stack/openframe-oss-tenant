<template>
  <div class="module-layout">
    <aside class="module-sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="module-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// No props or logic needed for now
</script>

<style scoped>
.module-layout {
  display: flex;
  height: 100vh;
  width: 100%;
}

.module-sidebar {
  width: 280px;
  background: var(--surface-section);
  border-right: 1px solid var(--surface-border);
  height: 100%;
  overflow-y: auto;
}

.module-content {
  flex: 1;
  overflow-y: auto;
  background: var(--surface-ground);
}
</style> 