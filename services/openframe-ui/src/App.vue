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
  padding: 0.2rem 0.2rem !important; /* Minimal padding */
  margin: 0 !important; /* No margins */
  border-radius: var(--border-radius) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05) !important; /* Lighter shadow */
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: center !important; /* Center content */
  width: 100% !important;
  font-size: 0.7rem !important; /* Even smaller font size */
  min-height: unset !important; /* Remove min-height */
  height: 1.8rem !important; /* Fixed height */
  position: absolute !important; /* Absolute positioning */
  bottom: 0 !important; /* Position at bottom */
  left: 0 !important; /* Align to left */
  z-index: 1 !important; /* Ensure it stays on top */
}

/* Fix layout container to ensure all elements stay on one line */
.p-paginator > div {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  gap: 0 !important; /* No gap between elements */
  height: 1.4rem !important; /* Even smaller fixed height */
  max-width: fit-content !important; /* Prevent excessive width */
}

/* Current page indicator */
.p-paginator-current {
  display: inline-flex !important;
  white-space: nowrap !important;
  flex: 0 0 auto !important;
  margin-right: 0.5rem !important; /* Reduced margin */
  max-width: max-content !important;
  font-size: 0.875rem !important; /* Smaller font */
}

/* Pagination controls group - tightly grouped */
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
  margin: 0 !important; /* Remove margins */
}

/* Group navigation controls together */
.p-paginator-pages {
  margin: 0 !important;
  padding: 0 !important;
}

/* Individual page buttons - tightly packed */
.p-paginator-pages .p-paginator-page {
  min-width: 1.3rem !important; /* Extremely compact buttons */
  height: 1.3rem !important; /* Extremely compact buttons */
  margin: 0 !important; /* No margin */
  border-radius: var(--border-radius) !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.65rem !important; /* Tiny font */
  padding: 0 !important; /* Remove padding */
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
  margin-left: 0.5rem !important; /* Reduced margin */
  max-width: max-content !important;
}

/* Make dropdown more compact */
.p-paginator .p-dropdown {
  height: 2rem !important; /* Smaller height */
  font-size: 0.875rem !important; /* Smaller font */
}

/* Compact dropdown items */
.p-paginator .p-dropdown-panel .p-dropdown-items {
  padding: 0.25rem 0 !important; /* Reduced padding */
}

.p-paginator .p-dropdown-panel .p-dropdown-item {
  padding: 0.25rem 0.5rem !important; /* Reduced padding */
  font-size: 0.875rem !important; /* Smaller font */
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

/* Navigation buttons (first, prev, next, last) - extremely compact */
.p-paginator-first,
.p-paginator-prev,
.p-paginator-next,
.p-paginator-last {
  min-width: 1.3rem !important; /* Extremely compact buttons */
  height: 1.3rem !important; /* Extremely compact buttons */
  margin: 0 !important; /* No margin */
  border-radius: var(--border-radius) !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.65rem !important; /* Tiny font */
  padding: 0 !important; /* Remove padding */
}

/* Container for pagination to ensure proper positioning */
.p-datatable {
  position: relative !important;
  padding-bottom: 2.5rem !important; /* Add space for pagination */
}

.p-datatable-wrapper {
  position: relative !important;
  margin-bottom: 0.5rem !important; /* Space between table and pagination */
}

/* Improved mobile responsive layout */
@media screen and (max-width: 768px) {
  .p-paginator {
    padding: 0.2rem 0.2rem !important; /* Minimal padding */
    flex-direction: row !important; /* Keep on one row */
    align-items: center !important;
    gap: 0 !important; /* No gap */
    flex-wrap: nowrap !important; /* Prevent wrapping */
    overflow-x: auto !important; /* Allow horizontal scrolling if needed */
    justify-content: center !important; /* Center content */
    height: 1.6rem !important; /* Smaller height on mobile */
  }
  
  /* Group all elements properly for mobile */
  .p-paginator > div {
    justify-content: center !important;
    margin: 0 !important; /* No margins */
    flex-shrink: 0 !important; /* Prevent shrinking */
    gap: 0 !important; /* No gap */
  }
  
  /* Force current page indicator to be inline in mobile */
  .p-paginator .p-paginator-current {
    width: auto !important;
    flex: 0 0 auto !important;
    text-align: center !important;
    margin: 0 !important; /* No margin */
    font-size: 0.6rem !important; /* Tiny font */
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  
  /* Center pagination controls in mobile - extremely compact */
  .p-paginator .p-paginator-first,
  .p-paginator .p-paginator-prev,
  .p-paginator .p-paginator-pages,
  .p-paginator .p-paginator-next,
  .p-paginator .p-paginator-last {
    margin: 0 !important; /* No margins */
    min-width: 1.2rem !important; /* Extremely compact on mobile */
    height: 1.2rem !important; /* Extremely compact on mobile */
    flex-shrink: 0 !important; /* Prevent shrinking */
  }
  
  /* Position rows-per-page dropdown in mobile */
  .p-paginator .p-paginator-rpp-options {
    margin: 0 !important; /* No margin */
    min-width: 2.5rem !important; /* Even smaller dropdown */
    flex-shrink: 0 !important; /* Prevent shrinking */
  }
  
  /* Make dropdown more compact on mobile */
  .p-paginator .p-dropdown {
    height: 1.2rem !important; /* Extremely small height */
    font-size: 0.6rem !important; /* Tiny font */
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
