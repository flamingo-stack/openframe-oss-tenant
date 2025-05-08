<template>
  <div class="of-data-table">
    <div v-if="showFilters" class="of-data-table__header">
      <div class="of-data-table__search">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search" />
          <InputText v-model="filterValue" placeholder="Search..." class="w-full" />
        </span>
      </div>
      <div v-if="$slots.header" class="of-data-table__header-actions">
        <slot name="header"></slot>
      </div>
    </div>
    <DataTable
      :value="filteredData"
      :paginator="paginate"
      :rows="rows"
      :rowsPerPageOptions="rowsPerPageOptions"
      :filters="filters"
      stripedRows
      class="of-data-table__table"
      responsiveLayout="scroll"
      v-bind="$attrs"
      :loading="loading"
    >
      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" :sortable="col.sortable">
        <template #body="{ data, field }">
          <slot :name="field" :row="data" :value="getColumnValue(data, field)">
            {{ getColumnValue(data, field) }}
          </slot>
        </template>
      </Column>
      <template #empty>
        <div class="of-data-table__empty">
          <slot name="empty">No data available</slot>
        </div>
      </template>
      <template #loading>
        <div class="of-data-table__loading">
          <div class="of-data-table__spinner"></div>
          <span>Loading data...</span>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { computed, watch } from '@vue/runtime-core';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  paginate: {
    type: Boolean,
    default: true
  },
  rows: {
    type: Number,
    default: 10
  },
  rowsPerPageOptions: {
    type: Array,
    default: () => [5, 10, 25, 50]
  },
  showFilters: {
    type: Boolean,
    default: true
  }
});

// Filter value
const filterValue = ref('');

// Create filters object for DataTable
const filters = ref({
  global: { value: null as string | null, matchMode: 'contains' }
});

// Filtered data for table
const filteredData = computed(() => {
  if (!filterValue.value) return props.data;
  
  const searchTerm = filterValue.value.toLowerCase();
  return props.data.filter((row: any) => {
    return props.columns.some((col: any) => {
      const value = getColumnValue(row, col.field);
      return value && value.toString().toLowerCase().includes(searchTerm);
    });
  });
});

// Update global filter when filterValue changes
watch(() => filterValue.value, (newValue) => {
  filters.value = {
    global: { value: newValue, matchMode: 'contains' }
  };
});

// Helper to get value from nested object properties
const getColumnValue = (row: any, field: string) => {
  if (!row) return '';
  
  // Handle nested properties with dot notation
  return field.split('.').reduce((obj, key) => {
    return obj && obj[key] !== undefined ? obj[key] : null;
  }, row);
};
</script>

<style scoped>
.of-data-table {
  width: 100%;
  margin-bottom: var(--spacing-md, 16px);
}

.of-data-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm, 8px);
  gap: var(--spacing-sm, 8px);
}

.of-data-table__search {
  flex: 1;
}

.of-data-table__header-actions {
  display: flex;
  gap: var(--spacing-xs, 4px);
}

:deep(.of-data-table__table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.p-datatable-header) {
  background-color: var(--surface-section);
  padding: 16px;
}

:deep(.p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  padding: 12px 16px;
  font-weight: 600;
  border-color: var(--surface-border);
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 12px 16px;
  border-color: var(--surface-border);
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover);
}

:deep(.p-paginator) {
  background-color: var(--surface-card);
  border-color: var(--surface-border);
  padding: 8px;
}

.of-data-table__empty,
.of-data-table__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.of-data-table__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(var(--primary-color-rgb, 59, 130, 246), 0.2);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media screen and (max-width: 768px) {
  .of-data-table__header {
    flex-direction: column;
    align-items: stretch;
  }
  
  :deep(.p-datatable-thead > tr > th),
  :deep(.p-datatable-tbody > tr > td) {
    padding: 8px 12px;
  }
}
</style> 