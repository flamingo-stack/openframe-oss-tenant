<template>
  <div class="device-header">
    <div class="device-header__info">
      <div class="device-header__icon">
        <i :class="device ? (device.icon || getDeviceIcon(device)) : 'pi pi-desktop'" class="text-xl"></i>
      </div>
      <div class="device-header__details">
        <h3 class="device-header__title">{{ device ? (device.displayName || device.hostname) : 'Device Details' }}</h3>
        <span v-if="device && device.status" class="device-header__status" :class="`device-header__status--${getStatusClass(device.status)}`">
          {{ device.status }}
        </span>
      </div>
    </div>
    <div class="device-header__actions">
      <!-- Action buttons -->
      <template v-if="device">
        <!-- Common actions dropdown -->
        <OFButton 
          ref="actionButton"
          icon="pi pi-ellipsis-v" 
          class="p-button-text p-button-rounded" 
          aria-label="More Actions"
          @click="toggleActionsMenu"
          aria-haspopup="true"
          :aria-expanded="showActions"
          :aria-controls="actionsMenuId"
        />
        <div 
          v-if="showActions" 
          class="device-header__actions-menu" 
          :id="actionsMenuId"
          ref="actionsMenu"
        >
          <!-- Common actions -->
          <button class="device-header__action-item" @click="$emit('refresh-device')">
            <i class="pi pi-refresh mr-2"></i>
            <span>Refresh Device</span>
          </button>
          
          <!-- MDM specific actions -->
          <template v-if="device.type === 'mdm'">
            <button 
              class="device-header__action-item" 
              @click="$emit('lock-device')"
              :disabled="!device.moduleSpecific?.mdm?.enrollment_status"
            >
              <i class="pi pi-lock mr-2"></i>
              <span>Lock Device</span>
            </button>
            <button 
              class="device-header__action-item" 
              @click="$emit('unlock-device')"
              :disabled="!device.moduleSpecific?.mdm?.enrollment_status"
            >
              <i class="pi pi-unlock mr-2"></i>
              <span>Unlock Device</span>
            </button>
            <button 
              class="device-header__action-item device-header__action-item--danger" 
              @click="$emit('erase-device')"
              :disabled="!device.moduleSpecific?.mdm?.enrollment_status"
            >
              <i class="pi pi-trash mr-2"></i>
              <span>Erase Device</span>
            </button>
          </template>

          <!-- RMM specific actions -->
          <template v-if="device.type === 'rmm'">
            <button 
              class="device-header__action-item" 
              @click="$emit('run-command')"
            >
              <i class="pi pi-code mr-2"></i>
              <span>Run Command</span>
            </button>
            <button 
              class="device-header__action-item" 
              @click="$emit('reboot-device')"
            >
              <i class="pi pi-power-off mr-2"></i>
              <span>Reboot Device</span>
            </button>
          </template>

          <!-- RAC specific actions -->
          <template v-if="device.type === 'rac'">
            <button 
              class="device-header__action-item" 
              @click="$emit('remote-access')"
            >
              <i class="pi pi-desktop mr-2"></i>
              <span>Remote Access</span>
            </button>
            <button 
              class="device-header__action-item" 
              @click="$emit('file-transfer')"
            >
              <i class="pi pi-folder mr-2"></i>
              <span>File Transfer</span>
            </button>
          </template>

          <div class="device-header__action-divider"></div>

          <!-- Delete action for all devices -->
          <button 
            class="device-header__action-item device-header__action-item--danger" 
            @click="$emit('delete-device')"
          >
            <i class="pi pi-trash mr-2"></i>
            <span>Delete Device</span>
          </button>
        </div>
      </template>

      <!-- Close button -->
      <OFButton 
        icon="pi pi-times" 
        class="p-button-text p-button-rounded" 
        @click="$emit('close')"
        aria-label="Close" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onMounted, onUnmounted } from '@vue/runtime-core';
import { OFButton } from '../../ui';
import { UnifiedDevice } from '../../../types/device';

const props = defineProps({
  device: {
    type: Object as () => UnifiedDevice | null,
    default: null
  }
});

defineEmits([
  'close',
  'refresh-device',
  'lock-device',
  'unlock-device',
  'erase-device',
  'delete-device',
  'run-command',
  'reboot-device',
  'remote-access',
  'file-transfer'
]);

// Generate unique ID for the actions menu
const actionsMenuId = `actions-menu-${Math.random().toString(36).substring(2, 9)}`;

// References
const actionButton = ref<HTMLElement | null>(null);
const actionsMenu = ref<HTMLElement | null>(null);

// Actions menu state
const showActions = ref(false);

// Toggle actions menu
const toggleActionsMenu = (event: Event) => {
  // Stop propagation to prevent the click event from being handled by handleClickOutside
  event.stopPropagation();
  showActions.value = !showActions.value;
};

// Get device icon based on device type and platform
const getDeviceIcon = (device: UnifiedDevice) => {
  if (!device) return 'pi pi-desktop';
  
  // First check for direct platform-specific icons
  if (device.platform) {
    const platform = device.platform.toLowerCase();
    if (platform.includes('darwin') || platform.includes('mac')) return 'pi pi-apple';
    if (platform.includes('windows')) return 'pi pi-microsoft';
    if (platform.includes('linux')) return 'pi pi-linux';
    if (platform.includes('ios')) return 'pi pi-apple';
    if (platform.includes('android')) return 'pi pi-android';
  }
  
  // Check if it's a server type device
  if (device.hardware?.model?.toLowerCase().includes('server') || 
      device.moduleSpecific?.rmm?.isServer || 
      device.moduleSpecific?.type === 'server') {
    return 'pi pi-server';
  }
  
  // Check device type
  if (device.type === 'mdm') {
    return 'pi pi-mobile';
  }
  
  return 'pi pi-desktop';
};

// Get status class based on device status
const getStatusClass = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('online') || statusLower.includes('active')) return 'online';
  if (statusLower.includes('offline') || statusLower.includes('inactive')) return 'offline';
  if (statusLower.includes('warning') || statusLower.includes('pending')) return 'warning';
  if (statusLower.includes('error') || statusLower.includes('fail')) return 'error';
  return 'unknown';
};

// Close the actions menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  // Only handle clicks when menu is open
  if (!showActions.value) return;
  
  // Get the event target
  const target = event.target as Node;
  
  // Get action button element
  const buttonEl = actionButton.value;
  const menuEl = actionsMenu.value;
  
  // Check if click is outside both menu and button
  if (menuEl && 
      !menuEl.contains(target) && 
      buttonEl && 
      !buttonEl.contains(target)) {
    showActions.value = false;
  }
};

// Add/remove event listeners
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--surface-border);
  background-color: var(--surface-section);
}

.device-header__info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-header__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: var(--primary-color);
}

.device-header__details {
  display: flex;
  flex-direction: column;
}

.device-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.device-header__status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  margin-top: 4px;
}

.device-header__status--online {
  background-color: rgba(var(--success-color-rgb, 16, 185, 129), 0.1);
  color: var(--success-color, #10B981);
}

.device-header__status--offline {
  background-color: rgba(var(--text-color-secondary-rgb, 107, 114, 128), 0.1);
  color: var(--text-color-secondary, #6B7280);
}

.device-header__status--warning {
  background-color: rgba(var(--warning-color-rgb, 245, 158, 11), 0.1);
  color: var(--warning-color, #F59E0B);
}

.device-header__status--error {
  background-color: rgba(var(--danger-color-rgb, 239, 68, 68), 0.1);
  color: var(--danger-color, #EF4444);
}

.device-header__status--unknown {
  background-color: rgba(var(--info-color-rgb, 107, 114, 128), 0.1);
  color: var(--info-color, #6B7280);
}

.device-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.device-header__actions-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 220px;
  background-color: var(--surface-card);
  border-radius: var(--border-radius, 6px);
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
  z-index: 1001;
  padding: 8px 0;
  margin-top: 8px;
}

.device-header__action-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-color);
  font-size: 14px;
  transition: background-color 0.2s;
}

.device-header__action-item:hover {
  background-color: var(--surface-hover);
}

.device-header__action-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-header__action-item--danger {
  color: var(--danger-color, #EF4444);
}

.device-header__action-divider {
  height: 1px;
  background-color: var(--surface-border);
  margin: 8px 0;
}

@media screen and (max-width: 768px) {
  .device-header {
    padding: 12px 16px;
  }
  
  .device-header__icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .device-header__title {
    font-size: 16px;
  }
}
</style> 