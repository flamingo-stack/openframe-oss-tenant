<template>
  <ModuleLayout>
    <template #sidebar>
      <ModuleNavigation
        title="Remote Monitoring & Management"
        :navigationItems="navigationItems"
        poweredBy="tactical-rmm"
      />
    </template>
    <router-view></router-view>
  </ModuleLayout>
</template>

<script setup lang="ts">
import { computed } from '@vue/runtime-core';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/stores/themeStore';
import { getLogoUrl } from '@/services/LogoService';
import ModuleLayout from '../../components/shared/ModuleLayout.vue';
import ModuleNavigation from '../../components/shared/ModuleNavigation.vue';

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);

const route = useRoute();

const navigationItems = [
  {
    label: 'Dashboard',
    icon: 'pi pi-chart-line',
    path: '/rmm/dashboard'
  },
  {
    label: 'Devices',
    icon: 'pi pi-desktop',
    path: '/rmm/devices'
  },
  {
    label: 'Monitoring',
    icon: 'pi pi-chart-bar',
    path: '/rmm/monitoring'
  },
  {
    label: 'Scripts',
    icon: 'pi pi-code',
    path: '/rmm/scripts'
  },
  {
    label: 'Bulk Ops',
    icon: 'pi pi-server',
    path: '/rmm/bulkops'
  },
  {
    label: 'Automation',
    icon: 'pi pi-cog',
    path: '/rmm/automation'
  },
  {
    label: 'Settings',
    icon: 'pi pi-sliders-h',
    path: '/rmm/settings'
  }
];
</script>

<style scoped>
.rmm-layout {
  display: flex;
  height: 100%;
  width: 100%;
}

.side-nav-container {
  width: 280px;
  background: var(--surface-section);
  border-right: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
}

.navigation-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.navigation-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1rem 0;
}

.integration-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.credit-text {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.integration-logo {
  height: 24px;
  width: auto;
}

.integration-logo.invert {
  filter: invert(1);
}

.navigation-menu {
  list-style: none;
  padding: 1rem 0;
  margin: 0;
}

.navigation-menu li {
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.navigation-menu li:hover {
  background: var(--surface-hover);
}

.navigation-menu li.active {
  background: var(--primary-color);
}

.navigation-menu li.active .navigation-item {
  color: var(--primary-color-text);
}

.navigation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color);
}

.content-container {
  flex: 1;
  overflow: hidden;
  background: var(--surface-ground);
}
</style>  