<template>
  <SideNavigationLayout :navigationItems="navigationItems">
    <template #navigation>
      <SideNavigation :items="menuItems">
        <template #header>
          <div class="navigation-header">
            <h2>Mobile Device Management</h2>
            <div class="integration-credit">
              <span class="credit-text">Powered by</span>
              <img :src="getLogoUrl('fleet')" alt="Fleet" class="integration-logo tool-logo" :class="{ 'invert': isDark }" />
            </div>
          </div>
        </template>
      </SideNavigation>
    </template>
    <router-view></router-view>
  </SideNavigationLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/stores/themeStore';
import SideNavigationLayout from '../../components/SideNavigationLayout.vue';
import SideNavigation from '../../components/SideNavigation.vue';
import { getLogoUrl } from '@/services/LogoService';

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
    label: 'Profiles',
    icon: 'pi pi-id-card',
    path: '/mdm/profiles'
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
  height: 100%;
  display: flex;
}

.navigation-header {
  margin-bottom: 1rem;
  padding: 0.5rem;
}

.integration-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  border-top: 1px solid var(--surface-border);
  width: 100%;
  height: 28px;
}

.credit-text {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.integration-logo {
  height: 24px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
}

:deep(.side-navigation) {
  margin: 0;
  border-radius: 0;
  
  @media screen and (min-width: 768px) {
    width: 250px !important;
    flex: 0 0 250px !important;
  }
  
  @media screen and (max-width: 767px) {
    width: 100% !important;
    flex: 0 0 100% !important;
  }
}
</style> 