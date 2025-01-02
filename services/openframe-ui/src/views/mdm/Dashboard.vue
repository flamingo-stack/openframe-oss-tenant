<template>
  <div class="mdm-dashboard">
    <div class="coming-soon">
      <i class="pi pi-chart-line"></i>
      <h2>Dashboard Coming Soon</h2>
      <p>We're working on bringing you a comprehensive MDM dashboard. Stay tuned!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component logic will be added here
</script>

<style scoped>
.mdm-dashboard {
  padding: 2rem;
  height: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  flex: 1;
}

.coming-soon {
  text-align: center;
  padding: 4rem;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  margin: auto;
}

.coming-soon i {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 2rem;
  opacity: 0.7;
}

.coming-soon h2 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1rem 0;
}

.coming-soon p {
  font-size: 1.125rem;
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}
</style> 