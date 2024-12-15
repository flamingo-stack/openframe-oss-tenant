<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FleetService } from '@/api/FleetService'
import type { FleetHost } from '@/api/FleetService'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const router = useRouter()
const hosts = ref<FleetHost[]>([])
const searchQuery = ref('')
const loading = ref(false)

const fetchHosts = async () => {
  loading.value = true
  try {
    hosts.value = await FleetService.getHosts()
  } catch (error) {
    console.error('Error fetching hosts:', error)
    // TODO: Add error handling/notification
  } finally {
    loading.value = false
  }
}

const handleEditColumns = () => {
  // TODO: Implement column editor
}

const formatTimeAgo = (date: string) => {
  if (!date) return ''
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'a few seconds ago'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}

onMounted(() => {
  fetchHosts()
})
</script>

<template>
  <div class="hosts-container p-4">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-2xl font-bold">All Hosts</h1>
        <p class="text-gray-600">All hosts which have enrolled in Fleet</p>
        <span class="text-sm font-medium">{{ hosts.length }} hosts</span>
      </div>
      <Button label="Add new host" severity="primary" @click="router.push('/hosts/add')" />
    </div>

    <div class="flex justify-between items-center mb-4">
      <Button 
        label="Edit columns" 
        icon="pi pi-table" 
        class="p-button-text"
        @click="handleEditColumns" 
      />
      <span class="p-input-icon-left">
        <i class="pi pi-search" />
        <InputText 
          v-model="searchQuery" 
          placeholder="Search hostname, UUID, serial number, or IP address" 
          class="w-96"
        />
      </span>
    </div>

    <DataTable 
      :value="hosts" 
      :loading="loading"
      stripedRows
      showGridlines
      tableStyle="min-width: 50rem"
    >
      <Column field="hostname" header="Hostname" sortable>
        <template #body="{ data }">
          <RouterLink 
            :to="`/hosts/${data.id}`" 
            class="text-blue-600 hover:text-blue-800"
          >
            {{ data.hostname }}
          </RouterLink>
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <span 
            class="inline-flex items-center"
            :class="data.status === 'Online' ? 'text-green-600' : 'text-gray-600'"
          >
            <span 
              class="w-2 h-2 rounded-full mr-2"
              :class="data.status === 'Online' ? 'bg-green-600' : 'bg-gray-600'"
            />
            {{ data.status }}
          </span>
        </template>
      </Column>
      <Column field="platform" header="OS" sortable />
      <Column field="osquery_version" header="Osquery" sortable />
      <Column field="primary_ip" header="IP address" sortable />
      <Column field="last_seen" header="Last fetched" sortable>
        <template #body="{ data }">
          {{ formatTimeAgo(data.last_seen) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.hosts-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style> 