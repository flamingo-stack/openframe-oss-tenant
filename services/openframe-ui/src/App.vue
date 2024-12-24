<template>
  <div class="app-container">
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
</style>
