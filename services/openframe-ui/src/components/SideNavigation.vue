<template>
  <div class="side-navigation">
    <div class="navigation-header">
      <h2>{{ title }}</h2>
    </div>
    <ul class="navigation-menu">
      <li v-for="item in items" 
          :key="item.path" 
          :class="{ active: isActive(item.path) }">
        <div class="navigation-item" @click="navigate(item.path)">
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
  flex: 0 0 250px;
  background: var(--surface-card);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  margin: 1rem;
}

.navigation-header {
  margin-bottom: 1rem;
  padding: 0.5rem;
}

.navigation-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.navigation-menu {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.navigation-menu li {
  margin-bottom: 0.25rem;
}

.navigation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
}

.navigation-item:hover {
  background: var(--surface-hover);
}

li.active .navigation-item {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.navigation-item i {
  font-size: 1.2rem;
}
</style> 