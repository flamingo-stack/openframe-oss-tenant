<template>
  <div class="app-container">
    <!-- Show navbar only when not on auth pages -->
    <Menubar v-if="!isAuthPage" class="app-menubar" :model="menuItems">
      <template #start>
        <div class="flex align-items-center">
          <span class="text-xl font-semibold">Open<span class="text-primary">Frame</span></span>
        </div>
      </template>
      <template #end>
        <Button icon="pi pi-power-off" rounded text severity="secondary" @click="handleLogout" />
      </template>
    </Menubar>

    <!-- Main content area -->
    <main :class="{ 'auth-page': isAuthPage, 'main-content': !isAuthPage }">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import { AuthService } from './services/AuthService';

const route = useRoute();
const router = useRouter();

const isAuthPage = computed(() => {
  return ['/login', '/register'].includes(route.path);
});

const menuItems = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    to: '/'
  },
  // Add other menu items as needed
];

const handleLogout = () => {
  AuthService.logout();
  router.push('/login');
};
</script>

<style>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-menubar {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-card);
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  background: var(--surface-ground);
}

.auth-page {
  flex: 1;
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
