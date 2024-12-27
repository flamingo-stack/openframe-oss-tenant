<template>
  <SideNavigationLayout :title="'Mobile Device Management'" :navigationItems="navigationItems">
    <template #navigation>
      <SideNavigation :items="menuItems" :title="currentSection" />
    </template>
    <router-view></router-view>
  </SideNavigationLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SideNavigationLayout from '../../components/SideNavigationLayout.vue';
import SideNavigation from '../../components/SideNavigation.vue';

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
  if (currentRoute === 'mdm-devices') return 'Devices';
  if (currentRoute === 'mdm-policies') return 'Policies';
  if (currentRoute === 'mdm-profiles') return 'Profiles';
  if (currentRoute === 'mdm-settings') return 'Settings';
  return 'Mobile Device Management';
});
</script>

<style scoped>
.mdm-layout {
  height: 100%;
  display: flex;
}
</style> 