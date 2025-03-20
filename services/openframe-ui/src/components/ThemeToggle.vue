<template>
  <OFButton
    :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
    class="theme-toggle p-button-text p-button-rounded"
    @click="toggleTheme"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const { toggleTheme } = themeStore
</script>

<style scoped>
.theme-toggle {
  color: var(--text-primary);
}

.theme-toggle:hover {
  background: var(--surface-hover);
}
</style>  