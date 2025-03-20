<template>
  <div class="of-module-table">
    <DataTable
      :value="items"
      :loading="loading"
      v-model:filters="filters"
      filterDisplay="menu"
      :paginator="true"
      paginatorClass="of-paginator"
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      responsiveLayout="scroll"
      stripedRows
      class="p-datatable-sm of-datatable"
      :globalFilterFields="searchFields"
      dataKey="id"
      removableSort
      showGridlines
    >
      <template #empty>
        <div class="of-empty-state">
          <i :class="emptyIcon" class="of-empty-icon"></i>
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyMessage }}</p>
          <p class="of-hint">{{ emptyHint }}</p>
        </div>
      </template>
      
      <slot />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import DataTable from 'primevue/datatable';

interface Props {
  items: any[];
  loading?: boolean;
  searchFields: string[];
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyHint?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyIcon: 'pi pi-info-circle',
  emptyTitle: 'No Items Found',
  emptyMessage: 'No items are available.',
  emptyHint: 'Items will appear here once they are added.'
});

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});
</script>

<style scoped>
.of-module-table {
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Dark mode specific styles */
:global([data-theme="dark"]) {
  .of-module-table {
    background: var(--surface-section);
  }

  :deep(.p-datatable) {
    .p-datatable-wrapper,
    .p-datatable-header,
    .p-datatable-footer {
      background: var(--surface-section);
    }
    
    /* Ensure all pagination elements get dark styling */
    .p-paginator.of-paginator {
      background: var(--surface-section) !important;
      color: var(--text-color) !important;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4) !important;
      
      /* Apply dark mode to all paginator elements */
      .p-paginator-current,
      .p-paginator-first,
      .p-paginator-prev,
      .p-paginator-next,
      .p-paginator-last,
      .p-paginator-page,
      .p-dropdown-label,
      .p-dropdown-trigger,
      .p-dropdown-panel {
        background: var(--surface-section) !important;
        color: var(--text-color) !important;
        
        &:not(.p-highlight):hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      }
      
      /* Fix dropdown styling in dark mode */
      .p-dropdown {
        background: var(--surface-section) !important;
        border-color: var(--surface-border) !important;
      }
    }
  }
}

:deep(.p-datatable) {
  .p-datatable-wrapper {
    border-radius: var(--border-radius);
    background: var(--surface-card);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .p-datatable-header {
    background: var(--surface-card);
    padding: 1.5rem;
    border: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-datatable-thead > tr > th {
    background: var(--surface-card) !important;
    color: var(--text-color) !important;
    padding: 1rem;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    border: none;
    border-bottom: none;

    &:first-child {
      border-top-left-radius: var(--border-radius);
    }

    &:last-child {
      border-top-right-radius: var(--border-radius);
    }
  }

  .p-datatable-tbody > tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    > td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;

      .pi {
        font-size: 1.125rem;
        color: var(--primary-color);

        &.pi-desktop {
          color: var(--text-color-secondary);
          opacity: 0.7;
        }
      }
    }

    &:last-child {
      border-bottom: none;
      
      > td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }
      
      > td:last-child {
        border-bottom-right-radius: var(--border-radius);
      }
    }
  }

  .p-paginator.of-paginator {
    background: var(--surface-card);
    border: none;
    padding: 1.25rem 1rem;
    margin-top: 1rem;
    border-radius: var(--border-radius);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    
    /* Fix layout container to ensure all elements stay on one line */
    > div {
      display: inline-flex !important;
      align-items: center !important;
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
    }
    
    /* Current page indicator */
    .p-paginator-current {
      display: inline-flex !important;
      white-space: nowrap !important;
      flex: 0 0 auto !important;
      margin-right: 1rem !important;
      max-width: max-content !important;
    }
    
    /* Pagination controls group */
    .p-paginator-first,
    .p-paginator-prev,
    .p-paginator-pages,
    .p-paginator-next,
    .p-paginator-last {
      display: inline-flex !important;
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    /* Individual page buttons */
    .p-paginator-pages .p-paginator-page {
      min-width: 2.5rem;
      height: 2.5rem;
      margin: 0 0.25rem;
      border-radius: var(--border-radius);
      font-weight: 600;
      transition: all 0.2s ease;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;

      &.p-highlight {
        background: var(--primary-color);
        color: var(--primary-color-text);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
      }

      &:not(.p-highlight):hover {
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
    }
    
    /* Rows per page selector */
    .p-paginator-rpp-options {
      flex: 0 0 auto !important;
      min-width: 4rem !important;
      margin-left: 1rem !important;
      max-width: max-content !important;
    }

    /* Improved mobile responsive layout */
    @media screen and (max-width: 768px) {
      padding: 1rem 0.75rem;
      flex-direction: column !important;
      align-items: center !important;
      gap: 0.75rem;
      
      /* Group all elements properly for mobile */
      > div {
        width: 100% !important;
        justify-content: center !important;
        margin-bottom: 0.5rem !important;
      }
      
      /* Force current page indicator to have its own row in mobile */
      .p-paginator-current {
        width: 100% !important;
        flex: 1 0 100% !important;
        text-align: center !important;
        margin: 0 0 0.5rem 0 !important;
      }
      
      /* Center pagination controls in mobile */
      .p-paginator-first,
      .p-paginator-prev,
      .p-paginator-pages,
      .p-paginator-next,
      .p-paginator-last {
        margin: 0 0.125rem !important;
      }
      
      /* Position rows-per-page dropdown in mobile */
      .p-paginator-rpp-options {
        margin: 0.5rem 0 0 0 !important;
      }
    }

    .p-paginator-pages .p-paginator-page {
      min-width: 2.5rem;
      height: 2.5rem;
      margin: 0 0.25rem;
      border-radius: var(--border-radius);
      font-weight: 600;
      transition: all 0.2s ease;

      &.p-highlight {
        background: var(--primary-color);
        color: var(--primary-color-text);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
      }

      &:not(.p-highlight):hover {
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
    }
  }
}

:deep(.p-tag) {
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-tag-success {
    background: var(--green-50);
    color: var(--green-900);
    border: 1px solid var(--green-200);
  }

  &.p-tag-danger {
    background: var(--red-50);
    color: var(--red-900);
    border: 1px solid var(--red-200);
  }

  &.p-tag-warning {
    background: var(--yellow-50);
    color: var(--yellow-900);
    border: 1px solid var(--yellow-200);
  }

  &.p-tag-info {
    background: var(--blue-50);
    color: var(--blue-900);
    border: 1px solid var(--blue-200);
  }
}

:deep(.p-button.p-button-icon-only) {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;

  &.p-button-text:enabled:hover {
    background: var(--surface-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-button-danger:enabled:hover {
    background: var(--red-50);
    color: var(--red-900);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .pi {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  &:hover .pi {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.of-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--surface-card);
  border-radius: var(--border-radius);

  .of-empty-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
  }

  p {
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.5;

    &.of-hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
      opacity: 0.8;
    }
  }
}
</style>                                                                                                                                                                                                                                                                                                                                                                            