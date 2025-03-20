<template>
  <div class="app-container">
    <Toast position="bottom-right" />
    <template v-if="!isAuthPage">
      <MainLayout>
        <RouterView />
      </MainLayout>
    </template>
    <template v-else>
      <main class="auth-page">
        <RouterView />
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from './components/MainLayout.vue';
import { useThemeStore } from './stores/themeStore';
import Toast from 'primevue/toast';

const route = useRoute();
const isAuthPage = computed(() => {
  return ['/login', '/register'].includes(route.path);
});

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initTheme();
});
</script>

<style>
.app-container {
  min-height: 100vh;
}

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-ground);
}

/* Reset body margin and set theme colors */
body {
  margin: 0;
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--surface-ground);
  color: var(--text-color);
}

/* Global pagination styles */
.p-paginator {
  background: var(--surface-card) !important;
  border: none !important;
  padding: 1.25rem 1rem !important;
  margin-top: 1rem !important;
  border-radius: var(--border-radius) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
}

/* Fix layout container to ensure all elements stay on one line */
.p-paginator > div {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
}

/* Current page indicator */
.p-paginator-current {
  display: inline-flex !important;
  white-space: nowrap !important;
  flex: 0 0 auto !important;
  margin-right: 1rem !important;
  max-width: max-content !important;
}

/* Pagination controls group */
.p-paginator-first,
.p-paginator-prev,
.p-paginator-pages,
.p-paginator-next,
.p-paginator-last {
  display: inline-flex !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Individual page buttons */
.p-paginator-pages .p-paginator-page {
  min-width: 2.5rem !important;
  height: 2.5rem !important;
  margin: 0 0.25rem !important;
  border-radius: var(--border-radius) !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Highlighted page */
.p-paginator-pages .p-paginator-page.p-highlight {
  background: var(--primary-color) !important;
  color: var(--primary-color-text) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4) !important;
}

/* Hover state for non-highlighted pages */
.p-paginator-pages .p-paginator-page:not(.p-highlight):hover {
  background: var(--surface-hover) !important;
  transform: translateY(-1px) !important;
}

/* Rows per page selector */
.p-paginator-rpp-options {
  flex: 0 0 auto !important;
  min-width: 4rem !important;
  margin-left: 1rem !important;
  max-width: max-content !important;
}

/* Dark mode for pagination */
[data-theme="dark"] .p-paginator {
  background: var(--surface-section) !important;
  color: var(--text-color) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4) !important;
}

/* Apply dark mode to all paginator elements */
[data-theme="dark"] .p-paginator .p-paginator-current,
[data-theme="dark"] .p-paginator .p-paginator-first,
[data-theme="dark"] .p-paginator .p-paginator-prev,
[data-theme="dark"] .p-paginator .p-paginator-pages,
[data-theme="dark"] .p-paginator .p-paginator-next,
[data-theme="dark"] .p-paginator .p-paginator-last,
[data-theme="dark"] .p-paginator .p-dropdown-label,
[data-theme="dark"] .p-paginator .p-dropdown-trigger,
[data-theme="dark"] .p-paginator .p-dropdown-panel {
  background: var(--surface-section) !important;
  color: var(--text-color) !important;
}

/* Hover state in dark mode */
[data-theme="dark"] .p-paginator .p-paginator-page:not(.p-highlight):hover,
[data-theme="dark"] .p-paginator .p-paginator-first:hover,
[data-theme="dark"] .p-paginator .p-paginator-prev:hover,
[data-theme="dark"] .p-paginator .p-paginator-next:hover,
[data-theme="dark"] .p-paginator .p-paginator-last:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* Fix dropdown styling in dark mode */
[data-theme="dark"] .p-paginator .p-dropdown {
  background: var(--surface-section) !important;
  border-color: var(--surface-border) !important;
}

/* Improved mobile responsive layout */
@media screen and (max-width: 768px) {
  .p-paginator {
    padding: 1rem 0.75rem !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 0.75rem !important;
  }
  
  /* Group all elements properly for mobile */
  .p-paginator > div {
    width: 100% !important;
    justify-content: center !important;
    margin-bottom: 0.5rem !important;
  }
  
  /* Force current page indicator to have its own row in mobile */
  .p-paginator .p-paginator-current {
    width: 100% !important;
    flex: 1 0 100% !important;
    text-align: center !important;
    margin: 0 0 0.5rem 0 !important;
  }
  
  /* Center pagination controls in mobile */
  .p-paginator .p-paginator-first,
  .p-paginator .p-paginator-prev,
  .p-paginator .p-paginator-pages,
  .p-paginator .p-paginator-next,
  .p-paginator .p-paginator-last {
    margin: 0 0.125rem !important;
  }
  
  /* Position rows-per-page dropdown in mobile */
  .p-paginator .p-paginator-rpp-options {
    margin: 0.5rem 0 0 0 !important;
  }
}

/* Remove outline on focused elements */
:focus {
  outline: none;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Toast styling */
:deep(.p-toast) {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  z-index: 1000 !important;
}

:deep(.p-toast-message) {
  background: #1c2127;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
}

:deep(.p-toast-message-content) {
  display: flex;
  align-items: flex-start;
  padding: 0;
}

:deep(.p-toast-message-text) {
  flex: 1;
  margin: 0;
  padding: 0;
}

:deep(.p-toast-message-icon) {
  margin-right: 12px;
  font-size: 20px;
}

:deep(.p-toast-summary) {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

:deep(.p-toast-detail) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

:deep(.p-toast-icon-close) {
  position: absolute;
  top: 12px;
  right: 12px;
  color: rgba(255, 255, 255, 0.5);
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: transparent;
  transition: all 0.2s ease;
  padding: 0;
  border: 0;
  outline: 0;
}

:deep(.p-toast-icon-close:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

:deep(.p-toast-message-error) {
  background: #1c2127;
}

:deep(.p-toast-message-error .p-toast-message-icon) {
  color: #ff4d4f;
}

:deep(.p-toast-message-success) {
  background: #1c2127;
}

:deep(.p-toast-message-success .p-toast-message-icon) {
  color: #52c41a;
}

:deep(.p-toast-detail a) {
  color: #1890ff;
  text-decoration: none;
}

:deep(.p-toast-detail a:hover) {
  text-decoration: underline;
}
</style>
