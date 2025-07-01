<template>
  <!-- Search field at the very top of the page -->
  <div class="search-bar-outer flex justify-center py-3">
    <div class="flex items-center gap-2 w-full max-w-2xl">
      <InputText
        v-model="searchQuery"
        placeholder="Search devices..."
        class="w-full"
        @keyup.enter="debouncedRefetch"
      />
      <Button icon="pi pi-search" label="Search" @click="debouncedRefetch" class="p-button-primary search-btn-gap" />
    </div>
  </div>

  <!-- Main layout and content below search field -->
  <div class="devices-layout bg-surface-100 flex flex-col">
    <div class="main-container w-full max-w-screen-2xl mx-auto px-4">
      <div class="flex flex-1 mt-3 gap-6 main-content-row">
        <!-- Left: Filter Sidebar -->
        <aside class="filter-sidebar w-360 min-w-[320px] max-w-[360px] bg-white border border-surface-200 rounded-lg px-6 pt-2 pb-2 flex flex-col shadow-sm">
          <div class="flex items-center justify-between mb-4 mt-4">
            <h2 class="text-lg font-semibold">Filters</h2>
          </div>
          <Accordion multiple :activeIndex="[0,1,2,3,4]">
            <AccordionTab header="Status">
              <div v-for="option in statusOptionsWithCounts" :key="option.value" class="flex items-center mb-2">
                <input
                  type="checkbox"
                  :id="`status-${option.value}`"
                  :value="option.value"
              v-model="selectedStatuses"
                  class="mr-2"
                />
                <label :for="`status-${option.value}`">{{ option.label }}</label>
          </div>
            </AccordionTab>
            <AccordionTab header="Device Type">
              <div v-for="option in deviceTypeOptionsWithCounts" :key="option.value" class="flex items-center mb-2">
                <input
                  type="checkbox"
                  :id="`deviceType-${option.value}`"
                  :value="option.value"
                  v-model="selectedDeviceTypes"
                  class="mr-2"
                />
                <label :for="`deviceType-${option.value}`">{{ option.label }}</label>
          </div>
            </AccordionTab>
            <AccordionTab header="OS Type">
              <div v-for="option in osTypeOptionsWithCounts" :key="option.value" class="flex items-center mb-2">
                <input
                  type="checkbox"
                  :id="`osType-${option.value}`"
                  :value="option.value"
              v-model="selectedOsTypes"
                  class="mr-2"
                />
                <label :for="`osType-${option.value}`">{{ option.label }}</label>
          </div>
            </AccordionTab>
            <AccordionTab header="Organization">
              <div v-for="option in organizationIdOptionsWithCounts" :key="option.value" class="flex items-center mb-2">
                <input
                  type="checkbox"
                  :id="`org-${option.value}`"
                  :value="option.value"
              v-model="selectedOrganizationIds"
                  class="mr-2"
                />
                <label :for="`org-${option.value}`">{{ option.label }}</label>
          </div>
            </AccordionTab>
            <AccordionTab header="Tags">
              <div v-for="option in tagOptionsWithCounts" :key="option.value" class="flex items-center mb-2">
                <input
                  type="checkbox"
                  :id="`tag-${option.value}`"
                  :value="option.value"
                  v-model="selectedTagNames"
                  class="mr-2"
                />
                <label :for="`tag-${option.value}`">{{ option.label }}</label>
          </div>
            </AccordionTab>
          </Accordion>
          <div class="pt-2 filters-buttons">
            <Button
              :label="`Apply Filters${filterCount !== null ? ` (${filterCount})` : ''}`"
              class="w-full p-button-primary"
              @click="applyFilters"
            />
            <Button label="Clear Filters" class="w-full p-button-outlined" @click="clearFilters" />
          </div>
        </aside>

        <!-- Main: Results Area -->
        <main class="flex flex-col">
          <!-- Device Cards Grid -->
          <div v-if="loading" class="flex justify-center items-center py-8">
            <span>Loading devices...</span>
          </div>
          <div v-else-if="error" class="flex justify-center items-center py-8 text-red-600">
            <span>Error: {{ error.message }}</span>
          </div>
          <div v-else class="device-cards-grid">
            <div
              v-for="device in devices"
              :key="device.id"
              class="device-card"
              @click="openDeviceModal(device)"
              style="cursor:pointer"
            >
              <div class="device-card-header">
                <div class="device-title">Device {{ device.id }}</div>
                <span
                  class="device-status-badge"
                  :class="{
                    'device-status-active': device.status === 'ACTIVE',
                    'device-status-maintenance': device.status === 'MAINTENANCE',
                    'device-status-decommissioned': device.status === 'DECOMMISSIONED',
                    'device-status-inactive': device.status === 'INACTIVE'
                  }"
                >
                  {{ capitalizeStatus(device.status) }}
                </span>
              </div>
              <div class="device-card-content">
                <div class="device-type-row">
                  <span v-if="device.type === 'LAPTOP'" class="device-type-icon" style="display:inline-flex;align-items:center;">
                    <!-- Inline SVG for laptop icon -->
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/><path d="M7 20v-2h10v2"/></svg>
                  </span>
                  <i v-else :class="getDeviceTypeIcon(device.type)" class="device-type-icon" />
                  <span class="device-type-label">{{ device.type }}</span>
                </div>
                <div class="device-name-row">{{ device.osType }}{{ device.osVersion ? ' ' + device.osVersion : '' }}</div>
                <div class="device-last-seen">Last seen: {{ device.lastSeen ? new Date(device.lastSeen).toLocaleString().slice(0, 16) : '—' }}</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Pagination bar here, inside main-container -->
      <div class="pagination-bar-outer">
        <div class="pagination-controls flex justify-center items-center gap-2 py-6 shadow-sm">
          <Button
            icon="pi pi-chevron-left"
            class="p-button-rounded p-button-outlined"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
            aria-label="Previous page"
          />
          <ul class="pagination-list flex items-center gap-1">
            <li v-for="(p, idx) in paginationPages" :key="p + '-' + idx">
              <span v-if="p === '...'" class="pagination-ellipsis">...</span>
              <button
                v-else
                class="pagination-page"
                :class="{ active: p === currentPage }"
                @click="changePage(p)"
                :disabled="p === currentPage"
              >
                {{ p }}
              </button>
            </li>
          </ul>
          <Button
            icon="pi pi-chevron-right"
            class="p-button-rounded p-button-outlined"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
            aria-label="Next page"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Device Details Modal -->
  <DeviceModal :visible="showModal" :close="closeDeviceModal">
    <template v-if="selectedDevice">
      <div class="device-modal-content">
        <h2 class="device-modal-title">Device Details</h2>
        <div class="device-modal-section">
          <div class="device-modal-section-title">Device Identity</div>
          <div class="device-modal-list">
            <div class="device-modal-row"><span class="device-modal-label">Display Name:</span><span class="device-modal-value">{{ selectedDevice.displayName || selectedDevice.hostname || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Type:</span><span class="device-modal-value">{{ selectedDevice.type || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Status:</span><span class="device-modal-value">{{ capitalizeStatus(selectedDevice.status) }}</span></div>
          </div>
        </div>
        <div class="device-modal-section">
          <div class="device-modal-section-title">Hardware & OS</div>
          <div class="device-modal-list">
            <div class="device-modal-row"><span class="device-modal-label">Manufacturer:</span><span class="device-modal-value">{{ selectedDevice.manufacturer || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Model:</span><span class="device-modal-value">{{ selectedDevice.model || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Serial Number:</span><span class="device-modal-value">{{ selectedDevice.serialNumber || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">OS Type:</span><span class="device-modal-value">{{ selectedDevice.osType || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">OS Version:</span><span class="device-modal-value">{{ selectedDevice.osVersion || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">OS Build:</span><span class="device-modal-value">{{ selectedDevice.osBuild || '—' }}</span></div>
          </div>
        </div>
        <div class="device-modal-section">
          <div class="device-modal-section-title">Network</div>
          <div class="device-modal-list">
            <div class="device-modal-row"><span class="device-modal-label">IP Address:</span><span class="device-modal-value">{{ selectedDevice.ip || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">MAC Address:</span><span class="device-modal-value">{{ selectedDevice.macAddress || '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Timezone:</span><span class="device-modal-value">{{ selectedDevice.timezone || '—' }}</span></div>
          </div>
        </div>
        <div class="device-modal-section">
          <div class="device-modal-section-title">Activity & Registration</div>
          <div class="device-modal-list">
            <div class="device-modal-row"><span class="device-modal-label">Last Seen:</span><span class="device-modal-value">{{ selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString() : '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Registered At:</span><span class="device-modal-value">{{ selectedDevice.registeredAt ? new Date(selectedDevice.registeredAt).toLocaleString() : '—' }}</span></div>
            <div class="device-modal-row"><span class="device-modal-label">Updated At:</span><span class="device-modal-value">{{ selectedDevice.updatedAt ? new Date(selectedDevice.updatedAt).toLocaleString() : '—' }}</span></div>
          </div>
        </div>
      </div>
    </template>
  </DeviceModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from '@vue/runtime-core';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { debounce } from 'lodash-es';
import { useDevices } from '@/composables/useDevices';
import { useDeviceFilters } from '@/composables/useDeviceFilters';
import DeviceModal from '@/components/ui/DeviceModal.vue';
import type { DeviceStatus, DeviceType } from '@/types/graphql';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';

// Data fetching composables
const { 
  devices, 
  loading, 
  error, 
  filter, 
  pagination, 
  search, 
  refetch, 
  currentPage,
  totalPages
} = useDevices();

const { 
  statuses, 
  deviceTypes, 
  osTypes, 
  organizationIds, 
  tags,
  filteredCount: filterCount,
  updateFilter 
} = useDeviceFilters();

// Search and filter state
const searchQuery = ref('');
const selectedStatuses = ref<DeviceStatus[]>([]);
const selectedDeviceTypes = ref<DeviceType[]>([]);
const selectedOsTypes = ref<string[]>([]);
const selectedOrganizationIds = ref<string[]>([]);
const selectedTagNames = ref<string[]>([]);

// Modal state
const showModal = ref(false);
const selectedDevice = ref<any | null>(null);

// Create filter options with counts
const statusOptionsWithCounts = computed(() => 
  statuses.value.map(status => ({
    label: `${status.value} (${status.count})`,
    value: status.value
  }))
);

const deviceTypeOptionsWithCounts = computed(() => 
  deviceTypes.value.map(type => ({
    label: `${type.value} (${type.count})`,
    value: type.value
  }))
);

const osTypeOptionsWithCounts = computed(() => 
  osTypes.value.map(osType => ({
    label: `${osType.value} (${osType.count})`,
    value: osType.value
  }))
);

const organizationIdOptionsWithCounts = computed(() => 
  organizationIds.value.map(orgId => ({
    label: `${orgId.value} (${orgId.count})`,
    value: orgId.value
  }))
);

const tagOptionsWithCounts = computed(() => 
  tags.value.map(tag => ({
    label: `${tag.label} (${tag.count})`,
    value: tag.value
  }))
);

// Debounced search
const debouncedRefetch = debounce(() => {
  const currentFilter = {
    statuses: selectedStatuses.value.length > 0 ? selectedStatuses.value : undefined,
    deviceTypes: selectedDeviceTypes.value.length > 0 ? selectedDeviceTypes.value : undefined,
    osTypes: selectedOsTypes.value.length > 0 ? selectedOsTypes.value : undefined,
    organizationIds: selectedOrganizationIds.value.length > 0 ? selectedOrganizationIds.value : undefined,
    tagNames: selectedTagNames.value.length > 0 ? selectedTagNames.value : undefined
  };

  // Update filter counts
  updateFilter(currentFilter);
  
  // Refetch devices
  refetch(currentFilter, { page: 1, pageSize: pagination.value.pageSize }, searchQuery.value);
}, 300);

// Debounced updateFilter for live filter count updates
const debouncedUpdateFilter = debounce((currentFilter) => {
  updateFilter(currentFilter);
}, 200);

// Watch for filter changes to update counts live
watch(
  [selectedStatuses, selectedDeviceTypes, selectedOsTypes, selectedOrganizationIds, selectedTagNames],
  () => {
    const currentFilter = {
      statuses: selectedStatuses.value.length > 0 ? selectedStatuses.value : undefined,
      deviceTypes: selectedDeviceTypes.value.length > 0 ? selectedDeviceTypes.value : undefined,
      osTypes: selectedOsTypes.value.length > 0 ? selectedOsTypes.value : undefined,
      organizationIds: selectedOrganizationIds.value.length > 0 ? selectedOrganizationIds.value : undefined,
      tagNames: selectedTagNames.value.length > 0 ? selectedTagNames.value : undefined
    };
    debouncedUpdateFilter(currentFilter);
  },
  { deep: true }
);

// Load initial filter counts
onMounted(async () => {
  await updateFilter(null);
});

// Filter functions
function clearFilters() {
  searchQuery.value = '';
  selectedStatuses.value = [];
  selectedDeviceTypes.value = [];
  selectedOsTypes.value = [];
  selectedOrganizationIds.value = [];
  selectedTagNames.value = [];
  
  // Update filter counts and refetch
  updateFilter(null);
  refetch({}, { page: 1, pageSize: pagination.value.pageSize }, '');
}

function applyFilters() {
  const currentFilter = {
    statuses: selectedStatuses.value.length > 0 ? selectedStatuses.value : undefined,
    deviceTypes: selectedDeviceTypes.value.length > 0 ? selectedDeviceTypes.value : undefined,
    osTypes: selectedOsTypes.value.length > 0 ? selectedOsTypes.value : undefined,
    organizationIds: selectedOrganizationIds.value.length > 0 ? selectedOrganizationIds.value : undefined,
    tagNames: selectedTagNames.value.length > 0 ? selectedTagNames.value : undefined
  };

  // Update filter counts
  updateFilter(currentFilter);
  
  // Refetch devices and reset to page 1
  refetch(currentFilter, { page: 1, pageSize: pagination.value.pageSize }, searchQuery.value);
}

// Modal functions
function openDeviceModal(device: any) {
  selectedDevice.value = device;
  showModal.value = true;
}

function closeDeviceModal() {
  showModal.value = false;
  selectedDevice.value = null;
}

// Pagination functions
function changePage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    refetch(filter.value, { page: newPage, pageSize: pagination.value.pageSize }, search.value);
  }
}

// Utility functions
function capitalizeStatus(status: string) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function getDeviceTypeIcon(type: string) {
  switch (type) {
    case 'TABLET':
      return 'pi pi-tablet';
    case 'DESKTOP':
      return 'pi pi-desktop';
    case 'LAPTOP':
      return 'pi pi-laptop';
    case 'SERVER':
      return 'pi pi-server';
    case 'MOBILE_DEVICE':
      return 'pi pi-mobile';
    case 'IOT_DEVICE':
      return 'pi pi-sliders-h';
    case 'VIRTUAL_MACHINE':
      return 'pi pi-cloud';
    case 'NETWORK_DEVICE':
      return 'pi pi-sitemap';
    case 'CONTAINER_HOST':
      return 'pi pi-box';
    case 'OTHER':
      return 'pi pi-cog';
    default:
      return 'pi pi-desktop';
  }
}

// MUI-style windowed pagination logic (max 5 page numbers, with ellipsis)
const paginationPages = computed(() => {
  const pages = [];
  const maxPagesToShow = 5;
  const total = totalPages.value;
  const current = currentPage.value;
  
  if (total <= maxPagesToShow) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  
  // Always show first and last
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  
  if (current <= 3) {
    // Show first 4, ... last
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    // Show first, ... last 4
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    // Show first, ... current-1, current, current+1, ... last
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  
  return pages;
});
</script>

<style scoped>
.devices-layout {
  background: #f6f7f9;
}

.main-container {
  width: 100%;
  max-width: 1536px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.search-bar-outer {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  box-shadow: none;
}

.filter-sidebar {
  min-width: 320px;
  max-width: 360px;
  width: 360px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
}

.device-cards-grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 1rem 0;
  align-items: start;
  align-content: start;
  grid-auto-rows: 1fr;
}

@media (min-width: 640px) {
  .device-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .device-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.device-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px 0 rgba(60,60,60,0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  height: 160px;
  min-height: 160px;
  max-height: 160px;
  position: relative;
}

.device-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.device-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-title {
  font-size: 18px;
  font-weight: 700;
  height: 24px;
  line-height: 24px;
  color: #222;
  margin-bottom: 0;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 28px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(60,60,60,0.08);
  background: #f5f5f5;
  color: #333;
  border: none;
  pointer-events: none;
  transition: background 0.2s, color 0.2s;
  margin-left: 8px;
}

.device-status-active {
  background: #e6f4ea;
  color: #1b5e20;
}

.device-status-maintenance {
  background: #fff8e1;
  color: #8d6e00;
}

.device-status-decommissioned {
  background: #ffebee;
  color: #b71c1c;
}

.device-status-inactive {
  background: #eceff1;
  color: #37474f;
}

.device-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #555;
  min-height: 24px;
}

.device-type-icon {
  font-size: 18px;
  color: #888;
}

.device-type-label {
  font-size: 16px;
  font-weight: 500;
  color: #555;
}

.device-name-row {
  font-size: 15px;
  color: #666;
  min-height: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-last-seen {
  font-size: 13px;
  color: #b0b0b0;
  font-weight: 500;
  margin-bottom: 0;
  margin-top: 0;
}

.filters-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.p-button-outlined {
  background: transparent !important;
  border: 1.5px solid var(--primary-color, #fbbf24) !important;
  color: var(--primary-color, #fbbf24) !important;
  box-shadow: none !important;
}

.main-content-row {
  margin-top: 12px !important;
}

.search-btn-gap .p-button-icon-right,
.search-btn-gap .p-button-icon-left {
  margin-right: 8px !important;
}

/* --- FORCE CONTENT-DRIVEN HEIGHT OVERRIDE --- */
.devices-layout,
.main-container,
.device-cards-grid {
  height: auto !important;
  min-height: 0 !important;
  flex: none !important;
}

/* Device Modal Styles */
.device-modal-content {
  padding: 8px 0 0 0;
}

.device-modal-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  text-align: center;
  letter-spacing: -0.5px;
}

.device-modal-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-modal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.device-modal-label {
  font-weight: 600;
  color: #444;
  min-width: 120px;
}

.device-modal-value {
  color: #222;
  font-weight: 400;
  text-align: right;
  word-break: break-all;
}

/* Modal Section Styles */
.device-modal-section {
  margin-bottom: 1.5rem;
}

.device-modal-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d2d2d;
  margin-bottom: 0.5rem;
  letter-spacing: -0.2px;
}

.pagination-bar-outer {
  width: 100%;
  display: flex;
  justify-content: center;
  background: transparent;
  margin-top: 0.5rem;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 1.5rem 0;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  margin: 0 auto;
  width: auto;
}

.pagination-controls .p-button {
  width: 2.5rem;
  height: 2.5rem;
}

.pagination-controls .p-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-list {
  display: flex;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.pagination-page {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 16px;
  font-weight: 500;
  color: #444;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-page.active,
.pagination-page:disabled {
  background: #fbbf24;
  color: #fff;
  cursor: default;
  font-weight: 700;
}

.pagination-page:not(.active):hover {
  background: #f3f4f6;
}

/* Style for PrimeVue AccordionTab headers in the filter sidebar */
.filter-sidebar :deep(.p-accordion-header) {
  margin-bottom: 12px;
}

.filter-sidebar :deep(.p-accordion-header .p-accordion-header-link) {
  font-size: 20px;
  min-height: 28px;
  line-height: 28px;
  font-weight: 700;
  padding-top: 4px;
  padding-bottom: 4px;
}

.filter-sidebar :deep(.p-accordion-header .p-accordion-header-link .p-accordion-toggle-icon) {
  margin-right: 6px;
}

@media (max-width: 640px) {
  .device-status-badge {
    top: 8px;
    right: 8px;
    font-size: 12px;
    height: 24px;
    padding: 0 8px;
  }
  
  .device-card-content {
    padding-top: 28px;
  }
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  color: #bbb;
  user-select: none;
}
</style> 