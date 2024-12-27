<template>
  <div class="side-navigation-layout">
    <div class="side-navigation">
      <div class="navigation-header">
        <h2>{{ title }}</h2>
      </div>
      <slot name="navigation"></slot>
      <SideNavigation :items="navigationItems" />
    </div>
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
  title?: string;
}

defineProps<Props>();
</script>

<style scoped>
.side-navigation-layout {
  display: flex;
  background: var(--surface-ground);
  overflow: hidden;
  position: relative;
}

.side-navigation {
  @media screen and (min-width: 768px) {
    width: 30rem !important;
    flex: 0 0 30rem !important;
  }
  
  @media screen and (max-width: 767px) {
    width: 100%;
    flex: 0 0 100%;
  }
  background: var(--surface-card);
  position: sticky;
  top: 0;
  overflow-y: auto;
  flex-shrink: 0;
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  height: 100%;
  min-height: 0;
}
</style> 