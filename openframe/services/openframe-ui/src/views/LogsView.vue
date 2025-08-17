<template>
  <div class="logs-view">
    <!-- Header Section -->
    <div class="logs-header">
      <div class="header-content">
        <div class="header-title">
          <h1 class="page-title">Logs</h1>
          <p class="page-subtitle">Monitor and analyze system events across all integrated tools</p>
        </div>
        <div class="header-actions">
          <!-- Refresh button removed -->
        </div>
      </div>
    </div>

    <!-- Search Section -->
    <div class="search-section">
      <div class="search-container">
        <div class="search-input-wrapper">
          <InputText
            v-model="searchQuery"
            placeholder="Search by user, device, or message content..."
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
    <div class="logs-content">
      <div class="content-layout">
        <!-- Filter Sidebar -->
        <aside class="filter-sidebar">
          <div class="filter-header">
            <h2 class="filter-title">Filters</h2>
            <!-- Refresh button removed -->
          </div>
          
          <div class="filter-sections">
            <!-- Date Range Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.dateRange = !expandedSections.dateRange">
                <i class="pi pi-calendar filter-icon"></i>
                <h3 class="filter-section-title">Date Range</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.dateRange ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.dateRange" class="filter-section-content">
                <div class="date-input-group">
                  <label class="date-label">Start Date</label>
                  <Calendar
                    v-model="selectedStartDate"
                    dateFormat="yy-mm-dd"
                    placeholder="Start date"
                    class="date-input"
                    :showIcon="true"
                  />
                </div>
                <div class="date-input-group">
                  <label class="date-label">End Date</label>
                  <Calendar
                    v-model="selectedEndDate"
                    dateFormat="yy-mm-dd"
                    placeholder="End date"
                    class="date-input"
                    :showIcon="true"
                  />
                </div>
              </div>
            </div>

            <!-- Tool Type Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.toolType = !expandedSections.toolType">
                <i class="pi pi-wrench filter-icon"></i>
                <h3 class="filter-section-title">Tool Type</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.toolType ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.toolType" class="filter-section-content">
                <div v-for="option in toolTypeOptions" :key="option" class="filter-checkbox-item">
                  <Checkbox
                    :id="`toolType-${option}`"
                    :value="option"
                    v-model="selectedToolTypes"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`toolType-${option}`" class="filter-checkbox-label">{{ option }}</label>
                </div>
              </div>
            </div>

            <!-- Event Type Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.eventType = !expandedSections.eventType">
                <i class="pi pi-list filter-icon"></i>
                <h3 class="filter-section-title">Event Type</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.eventType ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.eventType" class="filter-section-content">
                <div v-for="option in eventTypeOptions" :key="option" class="filter-checkbox-item">
                  <Checkbox
                    :id="`eventType-${option}`"
                    :value="option"
                    v-model="selectedEventTypes"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`eventType-${option}`" class="filter-checkbox-label">{{ option }}</label>
                </div>
              </div>
            </div>

            <!-- Severity Filter -->
            <div class="filter-section">
              <div class="filter-section-header" @click="expandedSections.severity = !expandedSections.severity">
                <i class="pi pi-exclamation-triangle filter-icon"></i>
                <h3 class="filter-section-title">Severity</h3>
                <i 
                  :class="[
                    'pi filter-toggle-icon',
                    expandedSections.severity ? 'pi-chevron-up' : 'pi-chevron-down'
                  ]"
                ></i>
              </div>
              <div v-if="expandedSections.severity" class="filter-section-content">
                <div v-for="option in severityOptions" :key="option" class="filter-checkbox-item">
                  <Checkbox
                    :id="`severity-${option}`"
                    :value="option"
                    v-model="selectedSeverities"
                    :binary="false"
                    class="filter-checkbox"
                  />
                  <label :for="`severity-${option}`" class="filter-checkbox-label">
                    <span class="severity-badge" :class="`severity-${option.toLowerCase()}`">{{ option }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div class="filter-actions">
            <Button
              label="Apply Filters"
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
              <p class="loading-text">Loading logs...</p>
            </div>
          </div>
          
          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <div class="error-content">
              <i class="pi pi-exclamation-triangle error-icon"></i>
              <h3 class="error-title">Error Loading Logs</h3>
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
            <!-- Results Header -->
            <div class="results-header">
              <div class="results-info">
                <span class="results-count">{{ logs.length }} logs loaded</span>
              </div>
              <div class="results-actions">
                <Button 
                  icon="pi pi-download" 
                  class="p-button-text p-button-sm" 
                  title="Export logs"
                />
              </div>
            </div>

            <!-- Logs List -->
            <div class="logs-list">
              <VirtualList
                :items="logs"
                :item-height="120"
                :container-height="760"
                :overscan="10"
                @scroll="handleVirtualScroll"
              >
                <template #default="{ item: log }">
                  <div
                    class="log-card"
                    @click="openLogModal(log)"
                  >
                    <!-- Date/Time Section (Left) -->
                    <div class="log-date-time">
                      <div class="log-date">{{ formatDateOnly(log.timestamp) }}</div>
                      <div class="log-time">{{ formatTimeOnly(log.timestamp) }}</div>
                    </div>

                    <!-- Device/Source Section (Middle-Left) -->
                    <div class="log-device-info">
                      <div class="log-device-id" v-if="log.deviceId && log.deviceId !== null && log.deviceId !== 'null'">
                        Device ID: {{ log.deviceId }}
                      </div>
                      <div class="log-user-id" v-if="log.userId && log.userId !== null && log.userId !== 'null'">
                        User ID: {{ log.userId }}
                      </div>
                      <div class="log-device-id" v-if="(!log.deviceId || log.deviceId === null || log.deviceId === 'null') && (!log.userId || log.userId === null || log.userId === 'null')">
                        —
                      </div>
                      <div class="log-tool-type">{{ log.toolType }}</div>
                    </div>

                    <!-- Message Section (Main Content) -->
                    <div class="log-message-section">
                      <div class="log-event-type">{{ log.eventType }}</div>
                      <div class="log-message-text">{{ log.summary || '—' }}</div>
                    </div>

                    <!-- Severity Badge Section (Right) -->
                    <div class="log-severity-section">
                      <span
                        class="log-severity-badge"
                        :class="getSeverityClass(log.severity)"
                      >
                        {{ log.severity }}
                      </span>
                      <i class="pi pi-chevron-right log-nav-icon"></i>
                    </div>
                  </div>
                  <!-- Divider line between cards -->
                  <div class="log-card-divider"></div>
                </template>
              </VirtualList>
              
              <!-- Load More Indicator -->
              <div v-if="hasNextPage" class="load-more-section">
                <div class="load-more-info">
                  <div class="remaining-count">
                    <span class="remaining-text">
                      <span v-if="hasNextPage">
                        Scroll to load more logs
                      </span>
                      <span v-else-if="logs.length > 0">
                        All available logs loaded
                      </span>
                      <span v-else>
                        No logs found
                      </span>
                    </span>
                  </div>
                  <div class="load-more-status">
                    <div v-if="isLoadingMore" class="loading-more">
                      <i class="pi pi-spin pi-spinner"></i>
                      <span>Loading more logs...</span>
                    </div>
                    <div v-else class="load-more-hint">
                      <span>Scroll to load more logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>

  <!-- Log Details Modal -->
  <LogModal :visible="showModal" :close="closeLogModal">
    <template v-if="selectedLog">
      <div class="log-modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Log Details</h2>
        </div>
        
        <!-- Loading state for detailed data -->
        <div v-if="detailedLogLoading" class="modal-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Loading detailed information...</span>
        </div>
        
        <!-- Error state for detailed data -->
        <div v-else-if="detailedLogError" class="modal-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Error loading detailed data: {{ detailedLogError.message }}</span>
        </div>
        
        <!-- Detailed log content -->
        <div v-else class="modal-content">
          <div class="detail-section">
            <h3 class="section-title">Event Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Event Type</span>
                <span class="detail-value">{{ selectedLog.eventType }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tool Type</span>
                <span class="detail-value">{{ selectedLog.toolType }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Severity</span>
                <span class="detail-value">
                  <span class="severity-chip" :class="getSeverityClass(selectedLog.severity)">
                    {{ selectedLog.severity }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tool Event ID</span>
                <span class="detail-value">{{ selectedLog.toolEventId }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3 class="section-title">Message</h3>
            <div class="message-content">
              {{ selectedLog.message || selectedLog.summary || 'No message available' }}
            </div>
          </div>
          
          <div class="detail-section">
            <h3 class="section-title">Metadata</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">User ID</span>
                <span class="detail-value">{{ selectedLog.userId || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Device ID</span>
                <span class="detail-value">{{ selectedLog.deviceId || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Ingest Day</span>
                <span class="detail-value">{{ selectedLog.ingestDay }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Timestamp</span>
                <span class="detail-value">{{ formatDate(selectedLog.timestamp) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Details section from Cassandra -->
          <div v-if="selectedLog.details" class="detail-section">
            <h3 class="section-title">Event Details</h3>
            <div class="details-content">
              <div v-for="(value, key) in parseDetails(selectedLog.details)" :key="key" class="detail-row">
                <span class="detail-key">{{ formatDetailKey(key) }}</span>
                <span class="detail-value">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </LogModal>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from '@vue/runtime-core';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import { debounce } from 'lodash-es';
import { useLogs } from '@/composables/useLogs';
import { useLogFilters } from '@/composables/useLogFilters';
import LogModal from '@/components/ui/LogModal.vue';
import VirtualList from '@/components/ui/VirtualList.vue';
import { useQuery } from '@vue/apollo-composable';
import { GET_LOG_DETAILS } from '@/graphql/queries';

// Data fetching composables
const { 
  logs, 
  loading, 
  error, 
  limit, 
  refetch, 
  hasNextPage,
  loadMore
} = useLogs();

const { 
  toolTypeOptions, 
  eventTypeOptions, 
  severityOptions,
  updateFilter 
} = useLogFilters();

// Search and filter state
const searchQuery = ref('');
const selectedStartDate = ref<Date | null>(null);
const selectedEndDate = ref<Date | null>(null);
const selectedToolTypes = ref<string[]>([]);
const selectedEventTypes = ref<string[]>([]);
const selectedSeverities = ref<string[]>([]);

// Filter section expansion state
const expandedSections = ref({
  dateRange: true,
  toolType: true,
  eventType: true,
  severity: true
});

// Modal state
const showModal = ref(false);
const selectedLog = ref<any | null>(null);

// Virtual scrolling state
const isLoadingMore = ref(false);

// Detailed log fetching
const detailedLogVariables = ref<any>(null);
const { result: detailedLogResult, loading: detailedLogLoading, error: detailedLogError } = useQuery(
  GET_LOG_DETAILS,
  detailedLogVariables,
  () => ({
    enabled: !!detailedLogVariables.value,
    fetchPolicy: 'network-only'
  })
);

// Watch for detailed log results
watch(detailedLogResult, (newResult) => {
  if (newResult?.logDetails) {
    selectedLog.value = {
      ...selectedLog.value,
      ...newResult.logDetails
    };
  }
});

// Debounced search
const debouncedRefetch = debounce(() => {
  const currentFilter = {
    startDate: selectedStartDate.value ? formatDateForAPI(selectedStartDate.value) : undefined,
    endDate: selectedEndDate.value ? formatDateForAPI(selectedEndDate.value) : undefined,
    toolTypes: selectedToolTypes.value.length > 0 ? selectedToolTypes.value : undefined,
    eventTypes: selectedEventTypes.value.length > 0 ? selectedEventTypes.value : undefined,
    severities: selectedSeverities.value.length > 0 ? selectedSeverities.value : undefined
  };

  updateFilter(currentFilter);
  refetch(currentFilter, limit.value, null, searchQuery.value);
}, 300);

// Debounced updateFilter for live filter count updates
const debouncedUpdateFilter = debounce((currentFilter) => {
  updateFilter(currentFilter);
}, 200);

// Watch for filter changes
watch(
  [selectedStartDate, selectedEndDate, selectedToolTypes, selectedEventTypes, selectedSeverities],
  () => {
    const currentFilter = {
      startDate: selectedStartDate.value ? formatDateForAPI(selectedStartDate.value) : undefined,
      endDate: selectedEndDate.value ? formatDateForAPI(selectedEndDate.value) : undefined,
      toolTypes: selectedToolTypes.value.length > 0 ? selectedToolTypes.value : undefined,
      eventTypes: selectedEventTypes.value.length > 0 ? selectedEventTypes.value : undefined,
      severities: selectedSeverities.value.length > 0 ? selectedSeverities.value : undefined
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
  selectedStartDate.value = null;
  selectedEndDate.value = null;
  selectedToolTypes.value = [];
  selectedEventTypes.value = [];
  selectedSeverities.value = [];
  
  updateFilter(null);
  refetch({}, limit.value, null, '');
}

function clearSearch() {
  searchQuery.value = '';
  debouncedRefetch();
}

function applyFilters() {
  const currentFilter = {
    startDate: selectedStartDate.value ? formatDateForAPI(selectedStartDate.value) : undefined,
    endDate: selectedEndDate.value ? formatDateForAPI(selectedEndDate.value) : undefined,
    toolTypes: selectedToolTypes.value.length > 0 ? selectedToolTypes.value : undefined,
    eventTypes: selectedEventTypes.value.length > 0 ? selectedEventTypes.value : undefined,
    severities: selectedSeverities.value.length > 0 ? selectedSeverities.value : undefined
  };

  updateFilter(currentFilter);
  refetch(currentFilter, limit.value, null, searchQuery.value);
}

// Modal functions
function openLogModal(log: any) {
  selectedLog.value = log;
  showModal.value = true;
  
  // For GraphQL Instant type, we need to pass the timestamp as-is (it should be an ISO string)
  const timestamp = log.timestamp;
  if (!timestamp) {
    return;
  }
  
  const variables = {
    ingestDay: log.ingestDay,
    toolType: log.toolType,
    eventType: log.eventType,
    timestamp: timestamp,
    toolEventId: log.toolEventId
  };
  
  detailedLogVariables.value = variables;
}

function closeLogModal() {
  showModal.value = false;
  selectedLog.value = null;
}

// Virtual scrolling functions
function handleVirtualScroll(event: any) {
  if (hasNextPage.value && !loading.value && !isLoadingMore.value) {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    
    if (isNearBottom) {
      isLoadingMore.value = true;
      loadMore().finally(() => {
        isLoadingMore.value = false;
      });
    }
  }
}

// Utility functions
function formatDate(timestamp: string) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
}

function formatDateOnly(timestamp: string) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString();
}

function formatTimeOnly(timestamp: string) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString();
}

function formatDateForAPI(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSeverityClass(severity: string) {
  if (!severity) return 'severity-default';
  const normalized = severity.toUpperCase().trim();
  switch (normalized) {
    case 'ERROR': return 'severity-error';
    case 'WARNING': return 'severity-warning';
    case 'INFO': return 'severity-info';
    case 'DEBUG': return 'severity-debug';
    case 'CRITICAL': return 'severity-critical';
    default: return 'severity-default';
  }
}

function parseDetails(details: any) {
  if (!details) return {};
  
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      try {
        const pairs = details.split(', ');
        const result: Record<string, string> = {};
        pairs.forEach(pair => {
          const [key, value] = pair.split(': ');
          if (key && value) {
            result[key.trim()] = value.trim();
          }
        });
        return result;
      } catch {
        return {};
      }
    }
  }
  
  if (typeof details === 'object') {
    return details;
  }
  
  return {};
}

function formatDetailKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Watch for loading state changes
watch(loading, (newLoading) => {
  if (!newLoading) {
    isLoadingMore.value = false;
  }
});

</script>

<style scoped>
.logs-view {
  min-height: 100vh;
  background: var(--surface-ground);
}

/* Header Section */
.logs-header {
  background: transparent;
  border-bottom: 1px solid var(--surface-border);
  padding: 16px 32px;
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
.logs-content {
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

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.date-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
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
}

/* Severity badges in filters */
.severity-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.severity-error {
  background: #d32f2f;
  color: #ffffff;
}

.severity-warning {
  background: #ed6c02;
  color: #ffffff;
}

.severity-info {
  background: #0288d1;
  color: #ffffff;
}

.severity-debug {
  background: #757575;
  color: #ffffff;
}

.severity-critical {
  background: #c62828;
  color: #ffffff;
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
  color: #000000 !important; }

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
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
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

.filtered-count {
  font-size: 14px;
  color: var(--text-color-secondary);
}

/* Logs List */
.logs-list {
  height: calc(100vh - 300px);
  overflow-y: auto;
  min-height: 400px;
}

.log-card {
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--surface-card);
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 0;
}

.log-card:hover {
  background: var(--surface-hover);
}

.log-card:last-child {
  margin-bottom: 0;
}

/* Divider between log cards */
.log-card-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 16px 24px;
}

/* Date/Time Section */
.log-date-time {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 100px;
  flex-shrink: 0;
  gap: 4px;
}

.log-date {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.log-time {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 600;
}

/* Device/Source Section */
.log-device-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 150px;
  flex-shrink: 0;
  gap: 4px;
}

.log-device-id {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.log-user-id {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.log-tool-type {
  font-size: 12px;
  color: var(--text-color);
  font-weight: 600;
  background: var(--surface-hover);
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Message Section */
.log-message-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-event-type {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  line-height: 1.3;
}

.log-message-text {
  font-size: 14px;
  color: var(--text-color-secondary);
  line-height: 1.5;
  margin: 0;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 20px;
}

.log-meta {
  font-size: 12px;
  color: var(--text-color-muted);
  margin-top: 4px;
}

/* Severity Badge Section */
.log-severity-section {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 120px;
  flex-shrink: 0;
}

.log-severity-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.log-nav-icon {
  color: var(--text-color-muted);
  font-size: 14px;
  flex-shrink: 0;
}

/* Severity Color Classes */
.severity-error {
  background: #ffebee;
  color: #b71c1c;
}

.severity-warning {
  background: #fff8e1;
  color: #8d6e00;
}

.severity-info {
  background: #e3f2fd;
  color: #1565c0;
}

.severity-debug {
  background: #eceff1;
  color: #37474f;
}

.severity-critical {
  background: #ffebee;
  color: #b71c1c;
}

.severity-default {
  background: #eceff1;
  color: #37474f;
}

/* Load More Section */
.load-more-section {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--surface-border);
}

.load-more-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.remaining-count {
  font-size: 14px;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.remaining-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.load-more-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.loading-more,
.load-more-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

/* Modal Styles */
.log-modal-content {
  max-width: 700px;
  width: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--surface-border);
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.modal-loading,
.modal-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 8px;
  font-size: 14px;
}

.modal-loading {
  background: var(--surface-hover);
  color: var(--text-color-secondary);
}

.modal-error {
  background: #fef2f2;
  color: var(--danger);
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--surface-border);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.message-content {
  background: var(--surface-hover);
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color);
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--surface-border);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-key {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-muted);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content-layout {
    flex-direction: column;
  }
  
  .filter-sidebar {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .logs-header {
    padding: 16px 20px;
  }
  
  .search-section {
    padding: 16px 20px;
  }
  
  .logs-content {
    padding: 16px 20px;
  }
  
  .search-container {
    flex-direction: column;
    gap: 12px;
  }
  
  .search-input-wrapper {
    max-width: none;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
}
</style> 