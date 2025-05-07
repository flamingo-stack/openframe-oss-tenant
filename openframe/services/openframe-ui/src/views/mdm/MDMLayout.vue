<template>
  <ModuleLayout>
    <template #sidebar>
      <ModuleNavigation
        title="Mobile Device Management"
        :navigationItems="navigationItems"
        poweredBy="fleet"
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
    path: '/mdm/dashboard'
  },
  {
    label: 'Devices',
    icon: 'pi pi-mobile',
    path: '/mdm/devices'
  },
  {
    label: 'Policies',
    icon: 'pi pi-shield',
    path: '/mdm/policies'
  },
  {
    label: 'Queries',
    icon: 'pi pi-database',
    path: '/mdm/queries'
  },
  {
    label: 'Profiles',
    icon: 'pi pi-id-card',
    path: '/mdm/profiles'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    path: '/mdm/settings'
  }
];

const menuItems = computed(() => {
  const currentRoute = route.name as string;
  if (currentRoute === 'mdm-settings') {
    return [
      {
        label: 'General',
        path: '/mdm/settings',
        icon: 'pi pi-cog'
      },
      {
        label: 'Enrollment',
        path: '/mdm/settings/enrollment',
        icon: 'pi pi-user-plus'
      },
      {
        label: 'Certificates',
        path: '/mdm/settings/certificates',
        icon: 'pi pi-shield'
      }
    ];
  }
  return [];
});

const currentSection = computed(() => {
  const currentRoute = route.name as string;
  if (currentRoute?.startsWith('mdm-settings')) return 'Settings';
  if (currentRoute === 'mdm-devices') return 'Devices';
  if (currentRoute === 'mdm-policies') return 'Policies';
  if (currentRoute === 'mdm-profiles') return 'Profiles';
  return 'Mobile Device Management';
});
</script>

<style scoped>
.mdm-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.side-nav-container {
  width: 250px;
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-right: 1px solid var(--surface-border);
}

.navigation-header {
  padding: 0.75rem;
  flex: 0 0 auto;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.4;
    color: var(--text-color);
  }
}

.integration-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  width: 100%;
  height: 24px;
  flex: 0 0 auto;
}

.credit-text {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.integration-logo {
  height: 20px;
  width: auto;
  max-width: 100px;
  object-fit: contain;
}

.navigation-menu {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
}

.navigation-item {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  color: var(--text-color);

  &:hover {
    background: var(--surface-hover);
  }

  i {
    font-size: 1.25rem;
    color: var(--text-color-secondary);
  }

  span {
    font-size: 0.875rem;
  }
}

li.active .navigation-item {
  background: var(--primary-color);
  color: var(--primary-color-text);

  i {
    color: var(--primary-color-text);
  }
}

.content-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: var(--surface-ground);
}
</style> 