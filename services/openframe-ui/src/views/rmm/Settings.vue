<template>
  <div class="rmm-settings">
    <div class="header">
      <div class="title-section">
        <h2>Settings</h2>
        <p class="subtitle">Configure RMM settings and preferences</p>
      </div>
      <div class="actions">
        <Button 
          label="Save Changes" 
          icon="pi pi-save"
          :loading="saving"
          :disabled="!hasChanges"
          @click="saveSettings"
        />
      </div>
    </div>

    <div class="content">
      <div class="grid">
        <!-- General Settings -->
        <div class="col-12 md:col-6 lg:col-4">
          <Panel header="General Settings">
            <div class="field">
              <label for="agentPort">Agent Port</label>
              <InputNumber 
                id="agentPort" 
                v-model="settings.agent_port" 
                :min="1" 
                :max="65535"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="checkInterval">Check Interval (minutes)</label>
              <InputNumber 
                id="checkInterval" 
                v-model="settings.check_interval" 
                :min="1" 
                :max="1440"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="logLevel">Log Level</label>
              <Dropdown
                id="logLevel"
                v-model="settings.log_level"
                :options="logLevels"
                optionLabel="name"
                optionValue="value"
                class="w-full"
              />
            </div>
          </Panel>
        </div>

        <!-- Monitoring Settings -->
        <div class="col-12 md:col-6 lg:col-4">
          <Panel header="Monitoring Settings">
            <div class="field">
              <label for="cpuWarning">CPU Warning Threshold (%)</label>
              <InputNumber 
                id="cpuWarning" 
                v-model="settings.monitoring.cpu_warning" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="cpuCritical">CPU Critical Threshold (%)</label>
              <InputNumber 
                id="cpuCritical" 
                v-model="settings.monitoring.cpu_critical" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="memoryWarning">Memory Warning Threshold (%)</label>
              <InputNumber 
                id="memoryWarning" 
                v-model="settings.monitoring.memory_warning" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="memoryCritical">Memory Critical Threshold (%)</label>
              <InputNumber 
                id="memoryCritical" 
                v-model="settings.monitoring.memory_critical" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="diskWarning">Disk Warning Threshold (%)</label>
              <InputNumber 
                id="diskWarning" 
                v-model="settings.monitoring.disk_warning" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>

            <div class="field">
              <label for="diskCritical">Disk Critical Threshold (%)</label>
              <InputNumber 
                id="diskCritical" 
                v-model="settings.monitoring.disk_critical" 
                :min="0" 
                :max="100"
                suffix="%"
                class="w-full"
              />
            </div>
          </Panel>
        </div>

        <!-- Notification Settings -->
        <div class="col-12 md:col-6 lg:col-4">
          <Panel header="Notification Settings">
            <div class="field">
              <label for="emailNotifications">Email Notifications</label>
              <div class="flex align-items-center">
                <InputSwitch 
                  id="emailNotifications"
                  v-model="settings.notifications.email_enabled"
                />
                <span class="ml-2">{{ settings.notifications.email_enabled ? 'Enabled' : 'Disabled' }}</span>
              </div>
            </div>

            <div class="field" v-if="settings.notifications.email_enabled">
              <label for="emailRecipients">Email Recipients</label>
              <Chips
                id="emailRecipients"
                v-model="settings.notifications.email_recipients"
                separator=","
                class="w-full"
                placeholder="Enter email and press Enter"
              />
            </div>

            <div class="field">
              <label for="slackNotifications">Slack Notifications</label>
              <div class="flex align-items-center">
                <InputSwitch 
                  id="slackNotifications"
                  v-model="settings.notifications.slack_enabled"
                />
                <span class="ml-2">{{ settings.notifications.slack_enabled ? 'Enabled' : 'Disabled' }}</span>
              </div>
            </div>

            <div class="field" v-if="settings.notifications.slack_enabled">
              <label for="slackWebhook">Slack Webhook URL</label>
              <InputText 
                id="slackWebhook"
                v-model="settings.notifications.slack_webhook"
                type="password"
                class="w-full"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import InputSwitch from 'primevue/inputswitch';
import InputText from 'primevue/inputtext';
import Chips from 'primevue/chips';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

interface MonitoringSettings {
  cpu_warning: number;
  cpu_critical: number;
  memory_warning: number;
  memory_critical: number;
  disk_warning: number;
  disk_critical: number;
}

interface NotificationSettings {
  email_enabled: boolean;
  email_recipients: string[];
  slack_enabled: boolean;
  slack_webhook: string;
}

interface Settings {
  agent_port: number;
  check_interval: number;
  log_level: string;
  monitoring: MonitoringSettings;
  notifications: NotificationSettings;
}

interface SettingsResponse {
  data: Settings;
}

const API_URL = `${envConfig.GATEWAY_URL}/tools/tactical-rmm/api/v1`;
const toastService = ToastService.getInstance();

const saving = ref(false);
const originalSettings = ref<Settings | null>(null);
const settings = ref<Settings>({
  agent_port: 8080,
  check_interval: 5,
  log_level: 'info',
  monitoring: {
    cpu_warning: 80,
    cpu_critical: 90,
    memory_warning: 80,
    memory_critical: 90,
    disk_warning: 80,
    disk_critical: 90
  },
  notifications: {
    email_enabled: false,
    email_recipients: [],
    slack_enabled: false,
    slack_webhook: ''
  }
});

const logLevels = [
  { name: 'Debug', value: 'debug' },
  { name: 'Info', value: 'info' },
  { name: 'Warning', value: 'warning' },
  { name: 'Error', value: 'error' }
];

const hasChanges = computed(() => {
  if (!originalSettings.value) return false;
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value);
});

const fetchSettings = async () => {
  try {
    const response = await restClient.get<SettingsResponse>(`${API_URL}/settings`);
    settings.value = response.data;
    originalSettings.value = JSON.parse(JSON.stringify(response.data));
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    toastService.showError('Failed to fetch settings');
  }
};

const saveSettings = async () => {
  saving.value = true;
  try {
    await restClient.patch(`${API_URL}/settings`, settings.value);
    originalSettings.value = JSON.parse(JSON.stringify(settings.value));
    toastService.showSuccess('Settings saved successfully');
  } catch (error: any) {
    console.error('Error saving settings:', error);
    toastService.showError('Failed to save settings');
  } finally {
    saving.value = false;
  }
};

// Watch for changes in email_enabled and slack_enabled to reset related fields
watch(() => settings.value.notifications.email_enabled, (newValue) => {
  if (!newValue) {
    settings.value.notifications.email_recipients = [];
  }
});

watch(() => settings.value.notifications.slack_enabled, (newValue) => {
  if (!newValue) {
    settings.value.notifications.slack_webhook = '';
  }
});

onMounted(async () => {
  await fetchSettings();
});
</script>

<style scoped>
.rmm-settings {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1.5rem 2rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: var(--text-color-secondary);
  margin: 0;
}

.content {
  flex: 1;
  padding: 2rem;
  background: var(--surface-ground);
  overflow-y: auto;
}

.field {
  margin-bottom: 1.5rem;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 500;
}

.p-panel .p-panel-content {
  padding: 1.5rem;
}
</style> 