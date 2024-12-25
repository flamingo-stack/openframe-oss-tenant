<template>
  <div class="layout-container" :data-theme="isDark ? 'dark' : 'light'">
    <nav class="navbar">
      <div class="navbar-start">
        <Button icon="pi pi-bars" text rounded @click="toggleMenu" class="menu-button" />
        <div class="brand">
          <div class="brand-name">
            <span class="brand-title">Open<span class="brand-highlight">Frame</span></span>
            <span class="brand-divider">@</span>
            <span class="brand-section">Dashboard</span>
          </div>
        </div>
      </div>
      <div class="navbar-end">
        <ThemeToggle />
        <Button 
          icon="pi pi-user" 
          text 
          rounded 
          class="mr-2" 
          @click="router.push('/profile')"
        />
        <Button icon="pi pi-power-off" text rounded severity="secondary" @click="handleLogout" />
      </div>
    </nav>

    <Sidebar 
      v-model:visible="menuVisible" 
      :modal="true" 
      :showCloseIcon="false"
      class="main-sidebar"
      :pt="{
        root: { class: isDark ? 'dark-theme' : 'light-theme' },
        content: { class: isDark ? 'dark-theme' : 'light-theme' }
      }"
    >
      <template #header>
        <div class="sidebar-header">
          <Button 
            icon="pi pi-times" 
            text 
            rounded 
            @click="menuVisible = false"
            class="close-button"
          />
        </div>
      </template>
      <div class="menu">
        <router-link 
          v-for="item in menuItems" 
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ active: route.path === item.path }"
          @click="menuVisible = false"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </div>
    </Sidebar>

    <div class="layout-content">
      <main class="main-content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Sidebar from 'primevue/sidebar';
import { AuthService } from '../services/AuthService';
import ThemeToggle from './ThemeToggle.vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'

const route = useRoute();
const router = useRouter();
const menuVisible = ref(false);
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const menuItems = [
  {
    label: 'Monitoring',
    icon: 'pi pi-chart-line',
    path: '/'
  },
  {
    label: 'Tools',
    icon: 'pi pi-wrench',
    path: '/tools'
  },
  {
    label: 'Mobile Device Management',
    icon: 'pi pi-mobile',
    path: '/mdm'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    path: '/settings'
  }
];

const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

const handleLogout = () => {
  AuthService.logout();
  router.push('/login');
};
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

:deep(.dark-theme) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}

:deep(.light-theme) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}

.navbar {
  padding: 0.75rem 2rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-content {
  flex: 1;
  display: flex;
  background: var(--surface-ground);
}

:deep(.main-sidebar) {
  .p-sidebar {
    @media screen and (min-width: 768px) {
      width: 250px;
    }
    @media screen and (max-width: 767px) {
      width: 100%;
    }
  }

  .p-sidebar-header {
    display: block !important;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-sidebar-content {
    padding: 0;
  }
}

.menu {
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  gap: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius);
  color: var(--text-color-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.menu-item.active {
  background: var(--primary-color);
  color: black;
}

.menu-item i {
  font-size: 1.25rem;
  color: inherit;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* Existing navbar styles... */
.navbar-start {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.navbar-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand {
  display: flex;
  align-items: center;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 600;
  display: inline-flex;
  align-items: baseline;
}

.brand-title {
  font-family: 'Ubuntu', sans-serif;
  letter-spacing: -0.005em;
  white-space: nowrap;
}

.brand-highlight {
  font-family: 'Ubuntu', sans-serif;
  color: var(--primary-color);
}

.brand-divider {
  font-family: var(--font-family);
  color: var(--text-color-secondary);
  margin: 0 0.3em;
  font-weight: normal;
}

.brand-section {
  font-family: var(--font-family);
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  font-weight: normal;
}

@media screen and (max-width: 767px) {
  .navbar {
    padding: 0.75rem 1rem;
  }

  .brand-section {
    display: none;
  }
}

.sidebar-header {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem;
}

.close-button {
  width: 2.5rem;
  height: 2.5rem;
}

:deep(.close-button) {
  .p-button-icon {
    font-size: 1rem;
  }

  &.p-button {
    padding: 0.5rem;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-indicator {
  font-size: 0.875rem;
  color: var(--text-color-muted);
  margin-right: 1rem;
}
</style> 