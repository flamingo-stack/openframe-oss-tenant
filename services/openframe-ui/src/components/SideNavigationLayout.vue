<template>
  <div class="side-navigation-layout">
    <SideNavigation :items="navigationItems" :title="title" />
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SideNavigation from './SideNavigation.vue';

interface Props {
  navigationItems: Array<{
    label: string;
    path: string;
    icon: string;
  }>;
  title: string;
}

defineProps<Props>();
</script>

<style scoped>
.side-navigation-layout {
  display: flex;
  /* height: 100%; */
  background: var(--surface-ground);
  overflow: hidden;
  position: relative;
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  height: 100%;
  min-height: 0;
}

:deep(.side-navigation) {
  position: sticky;
  top: 0;
  /* height: 100vh; */
  overflow-y: auto;
  flex-shrink: 0;
}
</style> 