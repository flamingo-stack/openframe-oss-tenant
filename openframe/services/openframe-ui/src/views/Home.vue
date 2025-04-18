<template>
  <div class="home">
    <div class="grid">
      <div class="col-12 md:col-6 lg:col-3">
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">0</span>
            <span class="stat-label">Total Platforms</span>
          </div>
          <div class="stat-icon">
            <i class="pi pi-desktop"></i>
          </div>
        </div>
      </div>

      <div class="col-12 md:col-6 lg:col-3">
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">0</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-icon success">
            <i class="pi pi-check"></i>
          </div>
        </div>
      </div>

      <div class="col-12 md:col-6 lg:col-3">
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">0</span>
            <span class="stat-label">Inactive</span>
          </div>
          <div class="stat-icon danger">
            <i class="pi pi-times"></i>
          </div>
        </div>
      </div>

      <div class="col-12 md:col-6 lg:col-3">
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">0</span>
            <span class="stat-label">Updates</span>
          </div>
          <div class="stat-icon warning">
            <i class="pi pi-refresh"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="grid mt-4">
      <div class="col-12">
        <div class="table-card">
          <div class="table-header mb-3">
            <h2 class="table-title my-0">Platforms</h2>
            <OFButton label="Add Platform" icon="pi pi-plus" severity="success" rounded />
          </div>
          
          <DataTable 
            :value="platforms" 
            :paginator="platforms.length > 0" 
            v-model:rows="rowsPerPage"
            :rowsPerPageOptions="[5,10,20]" 
            tableStyle="min-width: 50rem"
            stripedRows 
            class="p-datatable-sm" 
            responsiveLayout="scroll"
            v-model:filters="filters"
            filterDisplay="menu"
            :rowHover="true"
          >
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-box mb-3" style="font-size: 3rem; color: var(--text-color-secondary); opacity: 0.5;"></i>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0;">No Platforms Found</h3>
                <p style="color: var(--text-color-secondary); margin: 0; line-height: 1.5;">Add a platform to get started.</p>
              </div>
            </template>
            <template #paginatorstart>
              <div class="custom-paginator">
                <select v-model="rowsPerPage" class="rows-select">
                  <option v-for="option in [5,10,20]" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
            </template>
            <Column field="name" header="Name" :sortable="true">
              <template #body="slotProps">
                <div class="platform-name">
                  <i class="pi pi-box mr-2"></i>
                  {{ slotProps.data.name }}
                </div>
              </template>
            </Column>
            <Column field="status" header="Status" :sortable="true" style="width: 150px">
              <template #body="slotProps">
                <Tag 
                  :value="slotProps.data.status" 
                  :severity="slotProps.data.status === 'Active' ? 'success' : 'danger'" 
                  rounded 
                />
              </template>
            </Column>
            <Column field="lastUpdate" header="Last Update" :sortable="true" style="width: 200px" />
            <Column header="Actions" style="width: 100px">
              <template #body>
                <div class="flex align-items-center gap-2">
                  <OFButton icon="pi pi-pencil" text rounded severity="secondary" />
                  <OFButton icon="pi pi-trash" text rounded severity="danger" />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { OFButton } from '@/components/ui';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const filters = ref({});
const platforms = [
  { name: 'Platform 1', status: 'Active', lastUpdate: '2023-12-10' },
  { name: 'Platform 2', status: 'Inactive', lastUpdate: '2023-12-09' },
];
const rowsPerPage = ref(10);
</script>

<style scoped>
.home {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--surface-border);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  height: 100%;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1;
}

.stat-label {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--border-radius);
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.success {
  background: #10b981;
}

.stat-icon.danger {
  background: #ef4444;
}

.stat-icon.warning {
  background: #f59e0b;
}

.stat-icon i {
  font-size: 1rem;
}

.table-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  border: 1px solid var(--surface-border);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.table-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.platform-name {
  display: flex;
  align-items: center;
  color: var(--text-color);
}

:deep(.p-datatable) {
  margin-top: 1rem;
}

:deep(.p-datatable .p-datatable-header) {
  background: transparent;
  border: none;
  padding: 0;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-ground);
  border-width: 0 0 1px 0;
  padding: 1rem;
  font-weight: 600;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 1rem;
  border: none;
}

:deep(.p-tag) {
  padding: 0.25rem 0.75rem;
}

:deep(.p-button) {
  padding: 0.75rem 1.25rem;
  border-radius: 9999px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  border: none;
}

:deep(.p-button.p-button-success) {
  background: var(--primary-color);
  color: white;
}

:deep(.p-button.p-button-success:hover) {
  background: color-mix(in srgb, var(--primary-color) 85%, black);
  transform: translateY(-1px);
}

:deep(.p-button.p-button-success:active) {
  transform: translateY(0);
}

:deep(.p-button .p-button-icon) {
  margin: 0;
  font-size: 1rem;
}

:deep(.p-button .p-button-label) {
  font-weight: 500;
}

:deep(.p-ink) {
  display: none !important;
}

:deep(.p-button.p-button-text) {
  padding: 0.5rem;
  background: transparent;
}

:deep(.p-button.p-button-text:hover) {
  background: var(--surface-hover);
  transform: none;
}

:deep(.p-button.p-button-text.p-button-danger:hover) {
  color: var(--red-500);
}

@media screen and (max-width: 640px) {
  .home {
    padding: 0.5rem;
  }

  .table-card {
    padding: 1rem;
  }

  :deep(.p-datatable .p-datatable-thead > tr > th),
  :deep(.p-datatable .p-datatable-tbody > tr > td) {
    padding: 0.75rem;
  }
}

.custom-paginator {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.rows-select {
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  background: var(--surface-card);
  color: var(--text-color);
  font-size: 1rem;
  cursor: pointer;
  min-width: 5rem;
  outline: none;
}

.rows-select:hover {
  border-color: var(--primary-color);
}

.rows-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

:deep(.p-paginator-rpp-options) {
  display: none !important;
}
</style>        