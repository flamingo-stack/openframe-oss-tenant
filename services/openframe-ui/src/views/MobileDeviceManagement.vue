<template>
  <SideNavigationLayout 
    :title="'Mobile Device Management'"
    :navigation-items="navigationItems">
    <router-view></router-view>
  </SideNavigationLayout>
</template>

<script setup lang="ts">
import SideNavigationLayout from '../components/SideNavigationLayout.vue';

const navigationItems = [
  {
    label: 'Devices',
    icon: 'pi pi-mobile',
    path: '/mdm/devices'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    path: '/mdm/settings'
  }
];
</script>

<style scoped>
.mdm-dashboard {
  height: 100%;
  width: 100%;
}
</style> 