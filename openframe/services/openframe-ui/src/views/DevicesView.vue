<template>
  <div class="devices-view">
    <!-- Header Section -->
    <div class="devices-header">
      <div class="header-content">
        <div class="header-title">
          <h1 class="page-title">Devices</h1>
          <p class="page-subtitle">Monitor and manage all devices across integrated tools</p>
        </div>
        <div class="header-actions">
          <!-- Actions can be added here -->
        </div>
      </div>
    </div>

    <!-- Search Section -->
    <div class="search-section">
      <div class="search-container">
        <div class="search-input-wrapper">
          <InputText
            v-model="searchQuery"
            placeholder="Search devices by name, type, or status..."
            class="search-input"
            @keyup.enter="debouncedRefetch"
          />
          <Button 
            v-if="searchQuery"
            icon="pi pi-times" 
            class="p-button-text p-button-rounded clear-search-btn" 
            @click="clearSearch"
            title="Clear search"
          />
        </div>
        <Button 
          icon="pi pi-search" 
          label="Search" 
          @click="debouncedRefetch" 
          class="p-button-primary search-btn" 
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="devices-content">
      <div class="content-layout">
        <!-- Filter Sidebar -->
        <aside class="filter-sidebar">
          <div class="filter-header">
            <h2 class="filter-title">Filters</h2>
          </div>
          
          <div class="filter-sections">
            <!-- Status Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.status = !expandedSections.status">
                <i class="pi pi-circle-on filter-icon"></i>
                <h3 class="filter-section-title">Status</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.status ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.status" class="filter-section-content">
                <div v-for="option in statusOptionsWithCounts" :key="option.value" class="filter-checkbox-item">
                  <Checkbox
                    :id="`status-${option.value}`"
                    :value="option.value"
                    v-model="selectedStatuses"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`status-${option.value}`" class="filter-checkbox-label">
                    <span class="status-badge" :class="`status-${option.value.toLowerCase()}`">{{ option.value }}</span>
                    <span class="status-count">({{ option.count }})</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Device Type Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.deviceType = !expandedSections.deviceType">
                <i class="pi pi-desktop filter-icon"></i>
                <h3 class="filter-section-title">Device Type</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.deviceType ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.deviceType" class="filter-section-content">
                <div v-for="option in deviceTypeOptionsWithCounts" :key="option.value" class="filter-checkbox-item">
                  <Checkbox
                    :id="`deviceType-${option.value}`"
                    :value="option.value"
                    v-model="selectedDeviceTypes"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`deviceType-${option.value}`" class="filter-checkbox-label">{{ option.label }}</label>
                </div>
              </div>
            </div>

            <!-- OS Type Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.osType = !expandedSections.osType">
                <i class="pi pi-cog filter-icon"></i>
                <h3 class="filter-section-title">OS Type</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.osType ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.osType" class="filter-section-content">
                <div v-for="option in osTypeOptionsWithCounts" :key="option.value" class="filter-checkbox-item">
                  <Checkbox
                    :id="`osType-${option.value}`"
                    :value="option.value"
                    v-model="selectedOsTypes"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`osType-${option.value}`" class="filter-checkbox-label">{{ option.label }}</label>
                </div>
              </div>
            </div>

            <!-- Organization Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.organization = !expandedSections.organization">
                <i class="pi pi-building filter-icon"></i>
                <h3 class="filter-section-title">Organization</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.organization ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.organization" class="filter-section-content">
                <div v-for="option in organizationIdOptionsWithCounts" :key="option.value" class="filter-checkbox-item">
                  <Checkbox
                    :id="`org-${option.value}`"
                    :value="option.value"
                    v-model="selectedOrganizationIds"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`org-${option.value}`" class="filter-checkbox-label">{{ option.label }}</label>
                </div>
              </div>
            </div>

            <!-- Tags Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.tags = !expandedSections.tags">
                <i class="pi pi-tag filter-icon"></i>
                <h3 class="filter-section-title">Tags</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.tags ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.tags" class="filter-section-content">
                <div v-for="option in tagOptionsWithCounts" :key="option.value" class="filter-checkbox-item">
                  <Checkbox
                    :id="`tag-${option.value}`"
                    :value="option.value"
                    v-model="selectedTagNames"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`tag-${option.value}`" class="filter-checkbox-label">{{ option.label }}</label>
                </div>
              </div>
            </div>
          </div>
          
          <div class="filter-actions">
            <Button
              :label="`Apply Filters${filterCount !== null ? ` (${filterCount})` : ''}`"
              icon="pi pi-filter"
              class="p-button-primary apply-filters-btn"
              @click="applyFilters"
            />
            <Button 
              label="Clear Filters" 
              icon="pi pi-times"
              class="p-button-outlined clear-filters-btn" 
              @click="clearFilters" 
            />
          </div>
        </aside>

        <!-- Results Area -->
        <main class="results-area">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div class="loading-content">
              <i class="pi pi-spin pi-spinner loading-spinner"></i>
              <p class="loading-text">Loading devices...</p>
            </div>
          </div>
          
          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <div class="error-content">
              <i class="pi pi-exclamation-triangle error-icon"></i>
              <h3 class="error-title">Error Loading Devices</h3>
              <p class="error-message">{{ error.message }}</p>
              <Button 
                label="Try Again" 
                icon="pi pi-refresh" 
                @click="refetch" 
                class="p-button-primary" 
              />
            </div>
          </div>
          
          <!-- Results -->
          <div v-else class="results-container">
            <!-- Devices Grid -->
            <div class="devices-grid">
              <div
                v-for="device in devices"
                :key="device.id"
                class="device-card"
                @click="openDeviceModal(device)"
              >
                <div class="device-card-header">
                  <div class="device-title">{{ device.id }}</div>
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

            <!-- Pagination -->
            <div class="pagination-bar-outer">
              <div class="pagination-controls">
                <Button
                  icon="pi pi-chevron-left"
                  class="p-button-rounded p-button-outlined"
                  :disabled="!hasPreviousPage"
                  @click="loadPrevious"
                  aria-label="Previous page"
                />
                <div class="pagination-info">
                  <span class="pagination-text">Page {{ currentPage }} ({{ devices.length }} devices)</span>
                </div>
                <Button
                  icon="pi pi-chevron-right"
                  class="p-button-rounded p-button-outlined"
                  :disabled="!hasNextPage"
                  @click="loadMore"
                  aria-label="Next page"
                />
              </div>
            </div>
          </div>
        </main>
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
import Checkbox from 'primevue/checkbox';

// Data fetching composables
const { 
  devices, 
  loading, 
  error, 
  limit,
  refetch, 
  hasNextPage,
  hasPreviousPage,
  loadMore,
  loadPrevious,
  currentPage
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

// Filter section expansion state
const expandedSections = ref({
  status: true,
  deviceType: true,
  osType: true,
  organization: true,
  tags: true
});

// Modal state
const showModal = ref(false);
const selectedDevice = ref<any | null>(null);

// Create filter options with counts
const statusOptionsWithCounts = computed(() => 
  statuses.value.map(status => ({
    label: status.value,
    value: status.value,
    count: status.count
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

// Debounced refetch for search
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
  
  // Refetch devices with cursor-based pagination
  refetch(currentFilter, limit.value, undefined, searchQuery.value);
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
  refetch({}, limit.value, undefined, '');
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
  
  // Refetch devices and reset to first page
  refetch(currentFilter, limit.value, undefined, searchQuery.value);
}

function clearSearch() {
  searchQuery.value = '';
  debouncedRefetch();
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
</script>

<style scoped>
.devices-view {
  min-height: 100vh;
  background: var(--surface-ground);
}

/* Header Section */
.devices-header {
  background: transparent;
  border-bottom: 1px solid var(--surface-border);
  padding: 8px 32px; /* Reduced from 16px to 8px */
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: 32px;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.4;
  text-align: left;
}

/* Search Section */
.search-section {
  background: transparent;
  padding: 20px 32px;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 1340px;
  margin: 0 auto;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  height: 52px;
  padding: 12px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  font-size: 16px;
  background: var(--surface-card);
  color: var(--text-color);
  transition: all 0.2s ease;
  box-sizing: border-box;
  line-height: 1;
  margin: 0;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color-muted);
}

.search-btn {
  height: 52px;
  padding: 12px 64px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  border: none;
  line-height: 1;
  margin: 0;
  font-size: 16px;
  flex-shrink: 0;
}

/* Content Layout */
.devices-content {
  padding: 8px 32px 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.content-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* Filter Sidebar */
.filter-sidebar {
  width: 320px;
  flex-shrink: 0;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filter-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.filter-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-section {
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 20px;
}

.filter-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.filter-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.filter-section-header:hover {
  background: var(--surface-hover);
}

.filter-icon {
  color: var(--text-color-muted);
  font-size: 16px;
}

.filter-toggle-icon {
  color: var(--text-color-muted);
  font-size: 14px;
  transition: transform 0.2s ease;
}

.filter-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
}

.filter-section-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  transition: background-color 0.2s ease;
  border-radius: 6px;
  padding-left: 8px;
  margin-left: -8px;
}

.filter-checkbox-item:hover {
  background: var(--surface-hover);
}

.filter-checkbox {
  width: 18px;
  height: 18px;
}

.filter-checkbox-label {
  font-size: 14px;
  color: var(--text-color);
  cursor: pointer;
  user-select: none;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Status badges in filters */
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background: #e6f4ea;
  color: #1b5e20;
}

.status-maintenance {
  background: #fff8e1;
  color: #8d6e00;
}

.status-decommissioned {
  background: #ffebee;
  color: #b71c1c;
}

.status-inactive {
  background: #eceff1;
  color: #37474f;
}

.status-count {
  font-size: 12px;
  color: var(--text-color-muted);
  font-weight: 400;
}

.filter-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--surface-border);
}

.apply-filters-btn {
  padding: 12px 16px;
  font-weight: 600;
  border-radius: 8px;
}

.clear-filters-btn {
  padding: 12px 16px;
  font-weight: 600;
  border-radius: 8px;
  background: transparent !important;
  border: 1px solid var(--primary-color) !important;
  color: #000000 !important;
}

.clear-filters-btn:hover {
  background: var(--primary-color) !important;
  color: white !important;
}

/* Results Area */
.results-area {
  flex: 1;
  min-width: 0;
}

.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: var(--surface-card);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
}

.loading-content,
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.loading-spinner {
  font-size: 32px;
  color: var(--primary-color);
}

.loading-text {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0;
}

.error-icon {
  font-size: 48px;
  color: var(--danger);
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.error-message {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

/* Results Container */
.results-container {
  border-radius: 12px;
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
}

.results-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.results-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.results-actions {
  display: flex;
  gap: 8px;
}

.devices-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-items: start;
  align-content: start;
  grid-auto-rows: 1fr;
}

@media (min-width: 640px) {
  .devices-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .devices-grid {
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
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.device-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px 0 rgba(60,60,60,0.12);
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

/* --- FORCE CONTENT-DRIVEN HEIGHT OVERRIDE --- */
.devices-view,
.devices-content,
.devices-grid {
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

.pagination-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

.pagination-text {
  font-size: 14px;
  color: var(--text-color-secondary);
  font-weight: 500;
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