<template>
  <div class="software-table">
    <div class="table-header">
      <div class="search-container">
        <i class="pi pi-search"></i>
        <input type="text" v-model="searchText" placeholder="Search..." class="search-input" />
      </div>
      <div class="actions-container">
        <button class="export-button" v-if="software && software.length > 0">
          <i class="pi pi-download"></i>
          Export
        </button>
      </div>
    </div>
    
    <div class="table-wrapper">
      <table v-if="software && software.length > 0" class="software-data-table">
        <thead>
          <tr>
            <th class="column-name">
              <div class="column-header">
                <span>Name</span>
                <i class="pi pi-sort-alt"></i>
              </div>
            </th>
            <th class="column-version">
              <div class="column-header">
                <span>Version</span>
                <i class="pi pi-sort-alt"></i>
              </div>
            </th>
            <th class="column-publisher">
              <div class="column-header">
                <span>Publisher</span>
                <i class="pi pi-sort-alt"></i>
              </div>
            </th>
            <th class="column-installed">
              <div class="column-header">
                <span>Installed</span>
                <i class="pi pi-sort-alt"></i>
              </div>
            </th>
            <th class="column-source">
              <div class="column-header">
                <span>Source</span>
                <i class="pi pi-sort-alt"></i>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(app, index) in filteredSoftware" :key="index" :class="{ 'even-row': index % 2 === 1 }">
            <td class="column-name">
              <div class="name-cell">
                <i class="pi pi-file app-icon"></i>
                <span>{{ app.name }}</span>
              </div>
            </td>
            <td class="column-version">{{ app.version }}</td>
            <td class="column-publisher">{{ app.publisher || '-' }}</td>
            <td class="column-installed">{{ formatDate(app.installDate) }}</td>
            <td class="column-source">{{ app.source || '-' }}</td>
          </tr>
        </tbody>
      </table>
      
      <div v-else class="of-empty-state">
        <div class="of-empty-state__icon">
          <i class="pi pi-box"></i>
        </div>
        <h3 class="of-empty-state__title">No Software Found</h3>
        <p class="of-empty-state__message">No software inventory data available for this device.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/runtime-core';

interface Software {
  name: string;
  version: string;
  publisher?: string;
  installDate?: string;
  source?: string;
}

const props = defineProps({
  software: {
    type: Array as () => Software[],
    default: () => []
  }
});

const searchText = ref('');

const filteredSoftware = computed(() => {
  if (!searchText.value) return props.software;
  
  const term = searchText.value.toLowerCase();
  return props.software.filter((app: Software) => {
    return (
      app.name?.toLowerCase().includes(term) ||
      app.version?.toLowerCase().includes(term) ||
      app.publisher?.toLowerCase().includes(term) ||
      app.source?.toLowerCase().includes(term)
    );
  });
});

// Format date helper
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    return `${month} ${date.getDate()}, ${date.getFullYear()}`;
  } catch (error) {
    return dateString;
  }
};
</script>

<style scoped>
.software-table {
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-card);
  border-radius: 8px;
  overflow: hidden;
  color: var(--text-color);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
}

.search-container {
  position: relative;
  flex: 1;
}

.search-container i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color-secondary);
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background-color: var(--surface-card);
  color: var(--text-color);
  font-size: 14px;
}

.actions-container {
  margin-left: 16px;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: transparent;
  border: none;
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
}

.export-button:hover {
  background-color: var(--surface-hover);
}

.table-wrapper {
  overflow-x: auto;
  width: 100%;
}

.software-data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.software-data-table th,
.software-data-table td {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  border-bottom: 1px solid var(--surface-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color);
}

.software-data-table th {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 2;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-header i {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-icon {
  color: var(--primary-color);
  font-size: 14px;
}

.column-name {
  width: 30%;
}

.column-version {
  width: 15%;
}

.column-publisher {
  width: 20%;
}

.column-installed {
  width: 20%;
}

.column-source {
  width: 15%;
}

.even-row {
  background-color: var(--surface-ground);
}

.software-data-table tr:hover {
  background-color: var(--surface-hover);
}

/* Empty state styling */
.of-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  background-color: var(--surface-section);
  min-height: 300px;
}

.of-empty-state__icon {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 16px;
}

.of-empty-state__title {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.of-empty-state__message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}
</style> 