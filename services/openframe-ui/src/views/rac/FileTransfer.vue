<template>
  <div class="file-transfer">
    <ModuleHeader title="File Transfer">
    </ModuleHeader>
    
    <div class="transfer-content" v-if="!selectedDeviceId">
      <div class="select-device-prompt">
        <i class="pi pi-file"></i>
        <h3>Select a Device</h3>
        <p>Please select a device from the Devices page to transfer files.</p>
        <OFButton 
          label="Go to Devices" 
          icon="pi pi-arrow-right" 
          @click="router.push('/rac/devices')" 
          class="p-button-primary mt-4"
        />
      </div>
    </div>
    
    <div class="transfer-content" v-else>
      <div class="transfer-container">
        <div class="transfer-header">
          <div class="device-info">
            <i :class="getDeviceIcon(selectedDevice?.platform || 'unknown')" class="mr-2"></i>
            <h3>{{ selectedDevice?.hostname || 'Unknown Device' }}</h3>
          </div>
          <div class="transfer-actions">
            <OFButton 
              icon="pi pi-sync" 
              class="p-button-text" 
              v-tooltip.left="'Refresh Files'" 
            />
            <OFButton 
              icon="pi pi-times" 
              class="p-button-text p-button-danger" 
              v-tooltip.left="'Close'" 
              @click="closeTransfer"
            />
          </div>
        </div>
        
        <div class="transfer-content-area">
          <div class="file-explorer">
            <div class="explorer-header">
              <h4>Device Files</h4>
              <div class="explorer-actions">
                <OFButton 
                  icon="pi pi-upload" 
                  class="p-button-text p-button-sm" 
                  v-tooltip.top="'Upload File'" 
                />
                <OFButton 
                  icon="pi pi-folder" 
                  class="p-button-text p-button-sm" 
                  v-tooltip.top="'New Folder'" 
                />
              </div>
            </div>
            
            <div class="file-path-breadcrumb">
              <span class="path-item">Root</span>
              <i class="pi pi-chevron-right path-separator"></i>
              <span class="path-item">Home</span>
            </div>
            
            <div class="file-list">
              <div class="empty-state">
                <i class="pi pi-folder-open empty-icon"></i>
                <h3>No Files Found</h3>
                <p>This folder is empty or you don't have permission to view its contents.</p>
                <p class="hint">Try navigating to a different folder or uploading a file.</p>
              </div>
            </div>
          </div>
          
          <div class="transfer-queue">
            <div class="queue-header">
              <h4>Transfer Queue</h4>
              <div class="queue-actions">
                <OFButton 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm" 
                  v-tooltip.top="'Clear Queue'" 
                />
              </div>
            </div>
            
            <div class="queue-list">
              <div class="empty-state">
                <i class="pi pi-inbox empty-icon"></i>
                <h3>Queue Empty</h3>
                <p>No file transfers are currently queued.</p>
                <p class="hint">Select files to transfer from the file explorer.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "@vue/runtime-core";
import { useRouter, useRoute } from 'vue-router';
import { OFButton } from '../../components/ui';
import { restClient } from "../../apollo/apolloClient";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";

interface Device {
  id: string;
  hostname: string;
  platform: string;
  status: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
}

const router = useRouter();
const route = useRoute();
const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();

const loading = ref(false);
const selectedDeviceId = ref<string | null>(route.params.id as string || null);
const selectedDevice = ref<Device | null>(null);
const currentPath = ref('/');
const files = ref<FileItem[]>([]);
const transferQueue = ref<FileItem[]>([]);

const getDeviceIcon = (platform: string) => {
  const iconMap: Record<string, string> = {
    windows: 'pi pi-microsoft',
    darwin: 'pi pi-apple',
    linux: 'pi pi-server'
  };
  return iconMap[platform] || 'pi pi-desktop';
};

const fetchDeviceDetails = async () => {
  if (!selectedDeviceId.value) return;
  
  try {
    loading.value = true;
    // In a real implementation, this would fetch device details from API
    // For now, use mock data
    selectedDevice.value = {
      id: selectedDeviceId.value,
      hostname: `device-${selectedDeviceId.value}`,
      platform: ['windows', 'darwin', 'linux'][Math.floor(Math.random() * 3)],
      status: 'online'
    };
    
    // In a real implementation, this would be:
    // const response = await restClient.get<Device>(`${API_URL}/devices/${selectedDeviceId.value}`);
    // selectedDevice.value = response;
  } catch (error) {
    console.error('Failed to fetch device details:', error);
    toastService.showError('Failed to fetch device details');
  } finally {
    loading.value = false;
  }
};

const fetchFiles = async (path: string) => {
  if (!selectedDeviceId.value) return;
  
  try {
    loading.value = true;
    // In a real implementation, this would fetch files from the device
    // For now, use mock data
    files.value = [];
    currentPath.value = path;
    
    // In a real implementation, this would be:
    // const response = await restClient.get<FileItem[]>(`${API_URL}/devices/${selectedDeviceId.value}/files?path=${encodeURIComponent(path)}`);
    // files.value = response;
  } catch (error) {
    console.error('Failed to fetch files:', error);
    toastService.showError('Failed to fetch files');
  } finally {
    loading.value = false;
  }
};

const closeTransfer = () => {
  router.push('/rac/devices');
};

onMounted(async () => {
  if (selectedDeviceId.value) {
    await fetchDeviceDetails();
    await fetchFiles('/');
  }
});
</script>

<style scoped>
.file-transfer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.transfer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: var(--surface-ground);
}

.select-device-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: auto;
  max-width: 500px;
}

.select-device-prompt i {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.select-device-prompt h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.select-device-prompt p {
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.transfer-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.transfer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.device-info {
  display: flex;
  align-items: center;
}

.device-info i {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.device-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.transfer-actions {
  display: flex;
  gap: 0.5rem;
}

.transfer-content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.file-explorer {
  flex: 2;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--surface-border);
  overflow: hidden;
}

.explorer-header, .queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.explorer-header h4, .queue-header h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.explorer-actions, .queue-actions {
  display: flex;
  gap: 0.25rem;
}

.file-path-breadcrumb {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
  overflow-x: auto;
}

.path-item {
  font-size: 0.875rem;
  color: var(--text-color);
  cursor: pointer;
}

.path-item:hover {
  text-decoration: underline;
}

.path-separator {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin: 0 0.5rem;
}

.file-list, .queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.transfer-queue {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  height: 100%;
}

.empty-state .empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.empty-state p.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}
</style>
