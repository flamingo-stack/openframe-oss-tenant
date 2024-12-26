<template>
  <div class="side-navigation">
    <div class="navigation-header">
      <h2>{{ title }}</h2>
    </div>
    <ul class="side-menu">
      <li v-for="item in items" 
          :key="item.path" 
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)">
        <div class="menu-item">
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

interface MenuItem {
  label: string;
  path: string;
  icon: string;
}

interface Props {
  items: MenuItem[];
  title: string;
}

const props = defineProps<Props>();
const router = useRouter();
const route = useRoute();

const isActive = (path: string) => route.path === path;

const navigate = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.side-navigation {
  width: 250px;
  background: var(--surface-card);
  border-right: 1px solid var(--surface-border);
  height: 100%;
}

.navigation-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.navigation-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
  font-weight: 600;
}

.side-menu {
  list-style: none;
  padding: 1rem 0;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--text-color-secondary);
}

.menu-item:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.menu-item i {
  margin-right: 0.75rem;
  font-size: 1.1rem;
}

.menu-item span {
  font-size: 0.95rem;
}

li.active .menu-item {
  background: var(--yellow-500);
  color: var(--surface-900);
  font-weight: 600;
}
</style> 