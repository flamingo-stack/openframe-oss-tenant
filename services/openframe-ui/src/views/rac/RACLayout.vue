<template>
  <ModuleLayout>
    <template #sidebar>
      <ModuleNavigation
        title="Remote Access and Control"
        :navigationItems="navigationItems"
        poweredBy="meshcentral"
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
    path: '/rac/dashboard'
  },
  {
    label: 'Devices',
    icon: 'pi pi-desktop',
    path: '/rac/devices'
  },
  {
    label: 'Remote Connection',
    icon: 'pi pi-link',
    path: '/rac/remote-connection'
  },
  {
    label: 'File Transfer',
    icon: 'pi pi-file-export',
    path: '/rac/file-transfer'
  },
  {
    label: 'Settings',
    icon: 'pi pi-sliders-h',
    path: '/rac/settings'
  }
];
</script>
