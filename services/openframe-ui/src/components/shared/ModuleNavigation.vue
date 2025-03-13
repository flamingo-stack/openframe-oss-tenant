<template>
  <div class="module-navigation">
    <div class="navigation-header">
      <h2>{{ title }}</h2>
      <div v-if="poweredBy" class="integration-credit">
        <span class="credit-text">Powered by</span>
        <img :src="getLogoUrl(poweredBy)" :alt="poweredBy" class="integration-logo tool-logo" :class="{ 'invert': isDark }" />
      </div>
    </div>
    <ul class="navigation-menu">
      <router-link
        v-for="item in navigationItems"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ isActive, navigate }"
      >
        <li :class="{ active: isActive }" @click="navigate">
          <div class="navigation-item">
            <i :class="[item.icon, 'nav-icon']"></i>
            <span class="nav-label">{{ item.label }}</span>
          </div>
        </li>
      </router-link>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '../../stores/themeStore';
import { getLogoUrl } from '../../services/LogoService';

interface NavigationItem {
  label: string;
  icon: string;
  path: string;
}

defineProps<{
  title: string;
  navigationItems: NavigationItem[];
  poweredBy?: string;
}>();

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);
</script>

<style scoped>
.module-navigation {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.navigation-header {
  padding: 0.75rem;
  flex: 0 0 auto;
}

.navigation-header h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.4;
  color: var(--text-color);
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
}

.navigation-item:hover {
  background: var(--surface-hover);
}

.nav-icon {
  font-size: 1.25rem;
  color: var(--text-color-secondary);
  line-height: 1;
}

.nav-label {
  font-size: 0.875rem;
}

li.active .navigation-item {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

li.active .nav-icon {
  color: var(--primary-color-text);
}

li.active .nav-label {
  color: var(--primary-color-text);
}
</style> 