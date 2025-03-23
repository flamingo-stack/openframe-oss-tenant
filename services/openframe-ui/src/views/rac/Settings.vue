<template>
  <div class="rac-settings">
    <ModuleHeader title="Settings">
    </ModuleHeader>
    
    <div class="settings-content">
      <div class="settings-container">
        <div class="settings-section">
          <h3 class="section-title">MeshCentral Connection</h3>
          <div class="of-form-group">
            <label for="meshUrl">MeshCentral URL</label>
            <InputText id="meshUrl" v-model="settings.meshUrl" class="w-full" />
          </div>
          
          <div class="of-form-group">
            <label for="meshUser">Username</label>
            <InputText id="meshUser" v-model="settings.meshUser" class="w-full" />
          </div>
          
          <div class="of-form-group">
            <label for="meshPassword">Password</label>
            <Password id="meshPassword" v-model="settings.meshPassword" toggleMask class="w-full" />
          </div>
          
          <div class="of-form-group">
            <label for="meshGroup">Device Group</label>
            <InputText id="meshGroup" v-model="settings.meshGroup" class="w-full" />
          </div>
        </div>
        
        <div class="settings-section">
          <h3 class="section-title">Remote Connection Settings</h3>
          <div class="of-form-group">
            <div class="flex align-items-center">
              <Checkbox id="recordSessions" v-model="settings.recordSessions" :binary="true" />
              <label for="recordSessions" class="ml-2">Record remote sessions</label>
            </div>
          </div>
          
          <div class="of-form-group">
            <div class="flex align-items-center">
              <Checkbox id="notifyUser" v-model="settings.notifyUser" :binary="true" />
              <label for="notifyUser" class="ml-2">Notify user when connecting</label>
            </div>
          </div>
          
          <div class="of-form-group">
            <div class="flex align-items-center">
              <Checkbox id="requireConsent" v-model="settings.requireConsent" :binary="true" />
              <label for="requireConsent" class="ml-2">Require user consent</label>
            </div>
          </div>
        </div>
        
        <div class="settings-actions">
          <OFButton label="Save" icon="pi pi-save" @click="saveSettings" :loading="saving" />
          <OFButton label="Reset" icon="pi pi-refresh" class="p-button-secondary ml-2" @click="resetSettings" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "@vue/runtime-core";
import { OFButton } from '../../components/ui';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";

interface MeshSettings {
  meshUrl: string;
  meshUser: string;
  meshPassword: string;
  meshGroup: string;
  recordSessions: boolean;
  notifyUser: boolean;
  requireConsent: boolean;
}

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();

const loading = ref(false);
const saving = ref(false);
const settings = ref<MeshSettings>({
  meshUrl: '',
  meshUser: '',
  meshPassword: '',
  meshGroup: 'OpenFrame',
  recordSessions: false,
  notifyUser: true,
  requireConsent: false
});

const fetchSettings = async () => {
  try {
    loading.value = true;
    // In a real implementation, this would fetch settings from API
    // For now, use mock data
    settings.value = {
      meshUrl: 'http://localhost:8383',
      meshUser: 'mesh@openframe.io',
      meshPassword: '********',
      meshGroup: 'OpenFrame',
      recordSessions: false,
      notifyUser: true,
      requireConsent: false
    };
    
    // In a real implementation, this would be:
    // const response = await restClient.get<MeshSettings>(`${API_URL}/settings/`);
    // settings.value = response;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    toastService.showError('Failed to fetch settings');
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  try {
    saving.value = true;
    // In a real implementation, this would save settings to API
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    
    // In a real implementation, this would be:
    // await restClient.post(`${API_URL}/settings/`, settings.value);
    
    toastService.showSuccess('Settings saved successfully');
  } catch (error) {
    console.error('Failed to save settings:', error);
    toastService.showError('Failed to save settings');
  } finally {
    saving.value = false;
  }
};

const resetSettings = () => {
  fetchSettings();
};

onMounted(async () => {
  await fetchSettings();
});
</script>

<style scoped>
.rac-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: var(--surface-ground);
  overflow-y: auto;
}

.settings-container {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.settings-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.of-form-group {
  margin-bottom: 1.5rem;
}

.of-form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-border);
}
</style>
