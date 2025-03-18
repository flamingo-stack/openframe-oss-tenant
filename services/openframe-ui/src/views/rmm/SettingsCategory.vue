<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ formatKey(category) }}</h2>
    </div>

    <div class="settings-form">
      <template v-if="category === 'general'">
        <div class="field">
          <label for="defaultTimeZone">Default Time Zone</label>
          <Dropdown
            id="defaultTimeZone"
            v-model="settings.default_time_zone"
            :options="settings.all_timezones"
            class="w-full"
            @change="() => saveConfigProperty('default_time_zone', null)"
          />
        </div>

        <div class="field">
          <label for="agentDebugLevel">Agent Debug Level</label>
          <Dropdown
            id="agentDebugLevel"
            v-model="settings.agent_debug_level"
            :options="logLevels"
            optionLabel="name"
            optionValue="value"
            class="w-full"
            @change="() => saveConfigProperty('agent_debug_level', null)"
          />
        </div>

        <div class="field">
          <label for="agentAutoUpdate">Agent Auto Update</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="agentAutoUpdate"
              v-model="settings.agent_auto_update"
              @change="() => saveConfigProperty('agent_auto_update', null)"
            />
            <span class="ml-2">{{ settings.agent_auto_update ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>
      </template>

      <template v-else-if="category === 'alerts'">
        <div class="field">
          <label for="notifyWarning">Notify on Warning Alerts</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="notifyWarning"
              v-model="settings.notify_on_warning_alerts"
              @change="() => saveConfigProperty('notify_on_warning_alerts', null)"
            />
            <span class="ml-2">{{ settings.notify_on_warning_alerts ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>

        <div class="field">
          <label for="notifyInfo">Notify on Info Alerts</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="notifyInfo"
              v-model="settings.notify_on_info_alerts"
              @change="() => saveConfigProperty('notify_on_info_alerts', null)"
            />
            <span class="ml-2">{{ settings.notify_on_info_alerts ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>
      </template>

      <template v-else-if="category === 'email'">
        <div class="field">
          <label for="smtpFromEmail">From Email</label>
          <InputText
            id="smtpFromEmail"
            v-model="settings.smtp_from_email"
            class="w-full"
            @change="() => saveConfigProperty('smtp_from_email', null)"
          />
        </div>

        <div class="field">
          <label for="smtpFromName">From Name</label>
          <InputText
            id="smtpFromName"
            v-model="settings.smtp_from_name"
            class="w-full"
            @change="() => saveConfigProperty('smtp_from_name', null)"
          />
        </div>

        <div class="field">
          <label for="smtpHost">SMTP Host</label>
          <InputText
            id="smtpHost"
            v-model="settings.smtp_host"
            class="w-full"
            @change="() => saveConfigProperty('smtp_host', null)"
          />
        </div>

        <div class="field">
          <label for="smtpPort">SMTP Port</label>
          <InputNumber
            id="smtpPort"
            v-model="settings.smtp_port"
            class="w-full"
            @change="() => saveConfigProperty('smtp_port', null)"
          />
        </div>

        <div class="field">
          <label for="smtpRequiresAuth">SMTP Authentication</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="smtpRequiresAuth"
              v-model="settings.smtp_requires_auth"
              @change="() => saveConfigProperty('smtp_requires_auth', null)"
            />
            <span class="ml-2">{{ settings.smtp_requires_auth ? 'Required' : 'Not Required' }}</span>
          </div>
        </div>

        <div v-if="settings.smtp_requires_auth" class="field">
          <label for="smtpUser">SMTP Username</label>
          <InputText
            id="smtpUser"
            v-model="settings.smtp_host_user"
            class="w-full"
            @change="() => saveConfigProperty('smtp_host_user', null)"
          />
        </div>

        <div v-if="settings.smtp_requires_auth" class="field">
          <label for="smtpPassword">SMTP Password</label>
          <InputText
            id="smtpPassword"
            v-model="settings.smtp_host_password"
            type="password"
            class="w-full"
            @change="() => saveConfigProperty('smtp_host_password', null)"
          />
        </div>

        <div class="field">
          <label for="emailRecipients">Email Alert Recipients</label>
          <Chips
            id="emailRecipients"
            v-model="settings.email_alert_recipients"
            separator=","
            class="w-full"
            placeholder="Enter email and press Enter"
            @change="() => saveConfigProperty('email_alert_recipients', null)"
          />
        </div>
      </template>

      <template v-else-if="category === 'cleanup'">
        <div class="field">
          <label for="checkHistoryPrune">Check History Prune Days</label>
          <InputNumber
            id="checkHistoryPrune"
            v-model="settings.check_history_prune_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('check_history_prune_days', null)"
          />
          <small>Days to keep check history (0 for no pruning)</small>
        </div>

        <div class="field">
          <label for="resolvedAlertsPrune">Resolved Alerts Prune Days</label>
          <InputNumber
            id="resolvedAlertsPrune"
            v-model="settings.resolved_alerts_prune_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('resolved_alerts_prune_days', null)"
          />
          <small>Days to keep resolved alerts (0 for no pruning)</small>
        </div>

        <div class="field">
          <label for="agentHistoryPrune">Agent History Prune Days</label>
          <InputNumber
            id="agentHistoryPrune"
            v-model="settings.agent_history_prune_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('agent_history_prune_days', null)"
          />
          <small>Days to keep agent history (0 for no pruning)</small>
        </div>

        <div class="field">
          <label for="debugLogPrune">Debug Log Prune Days</label>
          <InputNumber
            id="debugLogPrune"
            v-model="settings.debug_log_prune_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('debug_log_prune_days', null)"
          />
          <small>Days to keep debug logs (0 for no pruning)</small>
        </div>

        <div class="field">
          <label for="auditLogPrune">Audit Log Prune Days</label>
          <InputNumber
            id="auditLogPrune"
            v-model="settings.audit_log_prune_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('audit_log_prune_days', null)"
          />
          <small>Days to keep audit logs (0 for no pruning)</small>
        </div>

        <div class="field">
          <label for="clearFaults">Clear Faults Days</label>
          <InputNumber
            id="clearFaults"
            v-model="settings.clear_faults_days"
            :min="0"
            class="w-full"
            @change="() => saveConfigProperty('clear_faults_days', null)"
          />
          <small>Days after which to automatically clear faults (0 to disable)</small>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import Dropdown from 'primevue/dropdown';
import Chips from 'primevue/chips';

const props = defineProps<{
  settings: any;
  formatKey: (key: string) => string;
  hasPropertyChanges: (category: string) => boolean;
  isSaving: (category: string) => boolean;
  saveConfigProperty: (category: string, subKey: string | null) => Promise<void>;
}>();

const route = useRoute();
const category = computed(() => route.params.category as string);

const logLevels = [
  { name: 'Debug', value: 'debug' },
  { name: 'Info', value: 'info' },
  { name: 'Warning', value: 'warning' },
  { name: 'Error', value: 'error' }
];
</script>

<style scoped>
.settings-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1.5rem;
}

.settings-header {
  margin-bottom: 2rem;
}

.settings-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.settings-form {
  max-width: 800px;
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

.field small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-color-secondary);
}

:deep(.p-inputswitch) {
  width: 3rem;
  height: 1.5rem;
}

:deep(.p-inputswitch .p-inputswitch-slider) {
  background: var(--surface-300);
}

:deep(.p-inputswitch:not(.p-disabled):hover .p-inputswitch-slider) {
  background: var(--surface-400);
}

:deep(.p-inputswitch.p-inputswitch-checked .p-inputswitch-slider) {
  background: var(--primary-color);
}

:deep(.p-inputswitch.p-inputswitch-checked:not(.p-disabled):hover .p-inputswitch-slider) {
  background: var(--primary-600);
}
</style> 