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
    
    .p-paginator.of-paginator {
      background: var(--surface-section);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
      
      .p-paginator-page,
      .p-paginator-first,
      .p-paginator-prev,
      .p-paginator-next,
      .p-paginator-last {
        background: transparent;
        color: var(--text-color);
        
        &:not(.p-highlight):hover {
          background: rgba(255, 255, 255, 0.1);
        }
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
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;

    .p-paginator-current {
      flex: 0 0 auto;
      margin-right: auto;
      white-space: nowrap;
      padding-right: 1rem;
    }

    .p-paginator-first,
    .p-paginator-prev,
    .p-paginator-pages,
    .p-paginator-next,
    .p-paginator-last {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .p-paginator-pages {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .p-paginator-rpp-options {
      flex: 0 0 auto;
      margin-left: 1rem;
    }

    @media screen and (max-width: 768px) {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      
      .p-paginator-current {
        order: 1;
        flex: 1 0 100%;
        margin: 0 0 0.5rem 0;
        text-align: center;
        padding-right: 0;
      }
      
      .p-paginator-first,
      .p-paginator-prev,
      .p-paginator-pages,
      .p-paginator-next,
      .p-paginator-last {
        order: 2;
        margin: 0;
      }
      
      .p-paginator-rpp-options {
        order: 3;
        margin: 0.5rem 0 0 0;
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