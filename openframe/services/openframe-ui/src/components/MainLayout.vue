<template>
  <div class="layout-container">
    <nav class="navbar">
      <div class="navbar-start">
        <div class="brand">
          <div class="brand-name">
            <span class="brand-title">Open<span class="brand-highlight">Frame</span></span>
            <span class="brand-divider">@</span>
            <span class="brand-section">Dashboard</span>
          </div>
        </div>
        <div class="menu-items">
          <Button 
            v-for="item in menuItems" 
            :key="item.label"
            :icon="item.icon"
            :label="item.label"
            text
            :class="{ active: route.path === item.to }"
            @click="router.push(item.to)"
          />
        </div>
      </div>
      <div class="navbar-end">
        <Button icon="pi pi-user" text rounded class="mr-2" />
        <Button icon="pi pi-power-off" text rounded severity="secondary" @click="handleLogout" />
      </div>
    </nav>
    
    <main class="main-content">
      <slot></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { AuthService } from '../services/AuthService';

const route = useRoute();
const router = useRouter();

const menuItems = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    to: '/'
  }
];

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

.navbar {
  padding: 0.75rem 2rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

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
  letter-spacing: -0.005em;
  white-space: nowrap;
}

.brand-highlight {
  color: var(--primary-color);
}

.brand-divider {
  color: var(--text-color-secondary);
  margin: 0 0.3em;
  font-weight: normal;
}

.brand-section {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  font-weight: normal;
}

.menu-items {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-items .p-button {
  padding: 0.5rem 1rem;
}

.menu-items .p-button.active {
  background: var(--surface-hover);
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  background: var(--surface-ground);
}
</style> 