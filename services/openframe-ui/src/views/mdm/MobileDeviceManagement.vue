<template>
  <SideNavigationLayout 
    :navigationItems="mdmNavigationItems"
    title="Mobile Device Management">
    <router-view></router-view>
  </SideNavigationLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SideNavigationLayout from '../../components/SideNavigationLayout.vue';

const mdmNavigationItems = [
  {
    label: 'Devices',
    path: '/mdm/devices',
    icon: 'pi pi-mobile'
  },
  {
    label: 'Policies',
    path: '/mdm/policies',
    icon: 'pi pi-shield'
  },
  {
    label: 'Profiles',
    path: '/mdm/profiles',
    icon: 'pi pi-cog'
  },
  {
    label: 'Settings',
    path: '/mdm/settings',
    icon: 'pi pi-sliders-h'
  }
];
</script> 