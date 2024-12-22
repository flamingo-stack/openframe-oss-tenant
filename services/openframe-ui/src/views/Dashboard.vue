<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <div class="grid">
      <div class="col-12 md:col-3">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-value">{{ stats.totalPlatforms }}</div>
            <div class="stats-label">Total Platforms</div>
          </div>
          <i class="pi pi-desktop stats-icon"></i>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-value">{{ stats.active }}</div>
            <div class="stats-label">Active</div>
          </div>
          <i class="pi pi-check-circle stats-icon success"></i>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-value">{{ stats.inactive }}</div>
            <div class="stats-label">Inactive</div>
          </div>
          <i class="pi pi-times-circle stats-icon danger"></i>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-value">{{ stats.updates }}</div>
            <div class="stats-label">Updates</div>
          </div>
          <i class="pi pi-sync stats-icon warning"></i>
        </div>
      </div>
    </div>

    <!-- Platforms Table -->
    <div class="card mt-4">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2 class="m-0">Platforms</h2>
        <Button label="Add Platform" icon="pi pi-plus" @click="openAddPlatform" />
      </div>

      <DataTable :value="platforms" :paginator="true" :rows="10" 
                stripedRows responsiveLayout="scroll"
                v-model:filters="filters"
                filterDisplay="menu"
                :loading="loading">
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <i class="pi pi-desktop mr-2"></i>{{ data.name }}
          </template>
          <template #filter="{ filterModel }">
            <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Search by name" />
          </template>
        </Column>
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :severity="getStatusSeverity(data.status)" :value="data.status" />
          </template>
          <template #filter="{ filterModel }">
            <Dropdown v-model="filterModel.value" :options="statusOptions" placeholder="Select Status" class="p-column-filter" />
          </template>
        </Column>
        <Column field="lastUpdate" header="Last Update" sortable>
          <template #body="{ data }">
            {{ formatDate(data.lastUpdate) }}
          </template>
        </Column>
        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="secondary" class="mr-2" @click="editPlatform(data)" />
            <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDelete(data)" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import { FilterMatchMode } from 'primevue/api';

const loading = ref(false);
const stats = ref({
  totalPlatforms: 0,
  active: 0,
  inactive: 0,
  updates: 0
});

const platforms = ref([
  { name: 'Platform 1', status: 'Active', lastUpdate: '2023-12-10' },
  { name: 'Platform 2', status: 'Inactive', lastUpdate: '2023-12-09' }
]);

const statusOptions = ['Active', 'Inactive'];

const filters = ref({
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS }
});

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Inactive': return 'danger';
    default: return 'warning';
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

const openAddPlatform = () => {
  // TODO: Implement add platform dialog
};

const editPlatform = (platform: any) => {
  // TODO: Implement edit platform
};

const confirmDelete = (platform: any) => {
  // TODO: Implement delete confirmation
};

onMounted(() => {
  // TODO: Load real data
  stats.value = {
    totalPlatforms: 2,
    active: 1,
    inactive: 1,
    updates: 0
  };
});
</script>

<style scoped>
.dashboard {
  height: 100%;
}

.stats-card {
  background: var(--surface-card);
  border-radius: 1rem;
  padding: 1.5rem;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stats-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.2;
}

.stats-label {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.stats-icon {
  font-size: 2rem;
  opacity: 0.2;
}

.stats-icon.success { color: var(--green-500); }
.stats-icon.danger { color: var(--red-500); }
.stats-icon.warning { color: var(--yellow-500); }

.card {
  background: var(--surface-card);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

:deep(.p-datatable) {
  border-radius: 0.5rem;
  overflow: hidden;
}

:deep(.p-datatable .p-datatable-header) {
  background: var(--surface-ground);
  border: none;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-section);
  border: none;
  font-weight: 600;
}

:deep(.p-tag) {
  border-radius: 1rem;
}
</style>
