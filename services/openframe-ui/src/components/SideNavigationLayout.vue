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
  height: 100%;
  background: var(--surface-ground);
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style> 