<template>
  <div class="device-details-slider">
    <div v-if="visible" class="sidebar-mask active" @click="onVisibilityChange(false)"></div>
    <div class="sidebar" :class="{ 'active': visible }">
      <!-- Device Header -->
      <DeviceHeader 
        :device="unifiedDevice" 
        @close="onVisibilityChange(false)"
        @refresh-device="$emit('refreshDevice', unifiedDevice)"
        @lock-device="$emit('lockDevice', unifiedDevice)"
        @unlock-device="$emit('unlockDevice', unifiedDevice)"
        @erase-device="$emit('eraseDevice', unifiedDevice)"
        @run-command="$emit('runCommand', unifiedDevice)"
        @reboot-device="$emit('rebootDevice', unifiedDevice)"
        @remote-access="$emit('remoteAccess', unifiedDevice)"
        @file-transfer="$emit('fileTransfer', unifiedDevice)"
        @delete-device="$emit('deleteDevice', unifiedDevice)"
      />

      <!-- Device Content with Tabs -->
      <div class="sidebar-content" v-if="unifiedDevice">
        <div class="of-tabs">
          <div class="of-tabs__header">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="of-tabs__tab"
              :class="{ 'of-tabs__tab--active': activeTab === tab.value }"
              @click="activeTab = tab.value"
            >
              <i :class="tab.icon" class="mr-2"></i>
              {{ tab.label }}
            </button>
          </div>
          <div class="of-tabs__content">
            <ScrollPanel class="scroll-panel">
              <component :is="activeTabComponent" :device="unifiedDevice" />
            </ScrollPanel>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from '@vue/runtime-core';
import ScrollPanel from 'primevue/scrollpanel';

// Import components
import DeviceHeader from './DeviceHeader.vue';
import OverviewSection from './sections/OverviewSection.vue';
import HardwareSection from './sections/HardwareSection.vue';
import NetworkSection from './sections/NetworkSection.vue';
import OSSection from './sections/OSSection.vue';
import SecuritySection from './sections/SecuritySection.vue';
import MobileSection from './sections/MobileSection.vue';
import UserSection from './sections/UserSection.vue';
import ManagementSection from './sections/ManagementSection.vue';
import SoftwareInventory from './sections/SoftwareInventory.vue';

import { autoConvertDevices, convertDevices } from '../../../utils/deviceAdapters';
import { UnifiedDevice, EnhancedUnifiedDevice } from '../../../types/device';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  device: {
    type: Object as () => UnifiedDevice | EnhancedUnifiedDevice | null,
    default: null
  },
  moduleType: {
    type: String,
    default: 'rmm'
  },
});

const emit = defineEmits([
  'update:visible',
  'refreshDevice',
  'lockDevice',
  'unlockDevice',
  'eraseDevice',
  'deleteDevice',
  'runCommand',
  'rebootDevice',
  'remoteAccess',
  'fileTransfer'
]);

// Active tab state
const activeTab = ref('overview');

// Tab definitions
const tabs = [
  { value: 'overview', label: 'Overview', icon: 'pi pi-info-circle', component: OverviewSection },
  { value: 'hardware', label: 'Hardware', icon: 'pi pi-desktop', component: HardwareSection },
  { value: 'network', label: 'Network', icon: 'pi pi-wifi', component: NetworkSection },
  { value: 'system', label: 'System', icon: 'pi pi-cog', component: OSSection },
  { value: 'software', label: 'Software', icon: 'pi pi-list', component: SoftwareInventory },
  { value: 'security', label: 'Security', icon: 'pi pi-shield', component: SecuritySection },
  { value: 'management', label: 'Management', icon: 'pi pi-server', component: ManagementSection },
];

// Mobile tab is conditional
const mobileTabs = computed(() => {
  if (isMobileDevice.value) {
    return [...tabs, { value: 'mobile', label: 'Mobile', icon: 'pi pi-mobile', component: MobileSection }];
  }
  return tabs;
});

// Get active tab component
const activeTabComponent = computed(() => {
  const tab = mobileTabs.value.find(t => t.value === activeTab.value);
  if (tab) {
    return tab.component;
  }
  
  // Default to overview if tab not found
  return OverviewSection;
});

// Convert devices to unified model
const unifiedDevice = computed(() => {
  if (!props.device) {
    return null;
  }

  if (props.moduleType) {
    return convertDevices(Array(props.device), props.moduleType)[0];
  }

  return autoConvertDevices(Array(props.device))[0];
});

// Check if this is a mobile device
const isMobileDevice = computed(() => {
  if (!unifiedDevice.value) return false;
  return unifiedDevice.value.type === 'mdm' || 
         (unifiedDevice.value.platform && ['ios', 'android'].includes(unifiedDevice.value.platform.toLowerCase()));
});

const onVisibilityChange = (value: boolean) => {
  emit('update:visible', value);
};

// Handle Escape key press
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    onVisibilityChange(false);
  }
};

// Add/remove event listeners
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
/* Device Details Slider Container */
.device-details-slider {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
}

/* Backdrop mask */
.sidebar-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.sidebar-mask.active {
  opacity: 1;
  pointer-events: all;
}

/* Sidebar styles */
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 800px;
  min-width: 60%;
  max-width: 80%;
  background-color: var(--surface-card);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  pointer-events: all;
}

.sidebar.active {
  transform: translateX(0);
}

/* Responsive adjustments */
@media screen and (max-width: 1440px) {
  .sidebar {
    min-width: 70%;
    max-width: 85%;
  }
}

@media screen and (max-width: 991px) {
  .sidebar {
    min-width: 80%;
    max-width: 90%;
  }
}

@media screen and (max-width: 767px) {
  .sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
  }
}

/* Sidebar content */
.sidebar-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Tab styles */
.of-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.of-tabs__header {
  display: flex;
  overflow-x: auto;
  background-color: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
}

.of-tabs__tab {
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.of-tabs__tab--active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
}

.of-tabs__tab:hover {
  color: var(--primary-color);
}

.of-tabs__content {
  flex: 1;
  overflow: hidden;
}

/* Scroll panel */
.scroll-panel {
  width: 100%;
  height: 100%;
}

:deep(.p-scrollpanel-content) {
  padding: 24px;
}

/* Responsive tab styles */
@media screen and (max-width: 768px) {
  .of-tabs__header {
    flex-wrap: wrap;
  }
  
  .of-tabs__tab {
    flex: 1 0 auto;
    min-width: 33.33%;
    justify-content: center;
  }
  
  :deep(.p-scrollpanel-content) {
    padding: 16px;
  }
}
</style> 