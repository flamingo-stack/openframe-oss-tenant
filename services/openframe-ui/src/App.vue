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
