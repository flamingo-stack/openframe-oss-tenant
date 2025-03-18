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

      <template v-else-if="category === 'sms'">
        <div class="field">
          <label for="twilioNumber">Twilio Number</label>
          <InputText
            id="twilioNumber"
            v-model="settings.twilio_number"
            class="w-full"
            @change="() => saveConfigProperty('twilio_number', null)"
          />
        </div>

        <div class="field">
          <label for="twilioAccountSid">Twilio Account SID</label>
          <InputText
            id="twilioAccountSid"
            v-model="settings.twilio_account_sid"
            class="w-full"
            @change="() => saveConfigProperty('twilio_account_sid', null)"
          />
        </div>

        <div class="field">
          <label for="twilioAuthToken">Twilio Auth Token</label>
          <Password
            id="twilioAuthToken"
            v-model="settings.twilio_auth_token"
            class="w-full"
            :feedback="false"
            toggleMask
            @change="() => saveConfigProperty('twilio_auth_token', null)"
          />
        </div>

        <div class="field">
          <label for="smsRecipients">SMS Alert Recipients</label>
          <Chips
            id="smsRecipients"
            v-model="settings.sms_alert_recipients"
            separator=","
            class="w-full"
            placeholder="Enter phone number and press Enter"
            @change="() => saveConfigProperty('sms_alert_recipients', null)"
          />
        </div>
      </template>

      <template v-else-if="category === 'custom_fields'">
        <div class="field">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3>Custom Fields</h3>
            <Button 
              icon="pi pi-plus" 
              label="Add Field"
              @click="showCustomFieldDialog = true"
            />
          </div>

          <DataTable 
            :value="settings.custom_fields || []"
            class="p-datatable-sm"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
          >
            <Column field="name" header="Name"></Column>
            <Column field="model" header="Model"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="required" header="Required">
              <template #body="{ data }">
                <i :class="data.required ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <Button 
                  icon="pi pi-pencil" 
                  class="p-button-text p-button-sm"
                  @click="editCustomField(data)"
                />
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteCustomField(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <template v-else-if="category === 'key_store'">
        <div class="field">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3>Key Store</h3>
            <Button 
              icon="pi pi-plus" 
              label="Add Key"
              @click="showKeyStoreDialog = true"
            />
          </div>

          <DataTable 
            :value="settings.key_store || []"
            class="p-datatable-sm"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
          >
            <Column field="name" header="Name"></Column>
            <Column field="value" header="Value">
              <template #body="{ data }">
                <span class="text-muted">••••••••</span>
                <Button 
                  icon="pi pi-copy" 
                  class="p-button-text p-button-sm"
                  @click="copyKeyStore(data.value)"
                />
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <Button 
                  icon="pi pi-pencil" 
                  class="p-button-text p-button-sm"
                  @click="editKeyStore(data)"
                />
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteKeyStore(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <template v-else-if="category === 'url_actions'">
        <div class="field">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3>URL Actions & Webhooks</h3>
            <Button 
              icon="pi pi-plus" 
              label="Add Action"
              @click="showUrlActionDialog = true"
            />
          </div>

          <DataTable 
            :value="allUrlActions"
            class="p-datatable-sm"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
          >
            <Column field="name" header="Name"></Column>
            <Column field="desc" header="Description"></Column>
            <Column field="pattern" header="Pattern"></Column>
            <Column field="action_type" header="Type">
              <template #body="{ data }">
                <Tag :value="data.action_type" :severity="data.action_type === 'web' ? 'info' : 'warning'" />
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <Button 
                  icon="pi pi-pencil" 
                  class="p-button-text p-button-sm"
                  @click="editUrlAction(data)"
                />
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteUrlAction(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <template v-else-if="category === 'api_keys'">
        <div class="field">
          <div class="flex justify-content-between align-items-center mb-3">
            <h3>API Keys</h3>
            <Button 
              icon="pi pi-plus" 
              label="Generate Key"
              @click="showNewApiKeyDialog = true"
            />
          </div>

          <DataTable 
            :value="settings.api_keys || []"
            class="p-datatable-sm"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[10, 20, 50]"
          >
            <Column field="name" header="Name"></Column>
            <Column field="key" header="Key">
              <template #body="{ data }">
                <span class="text-muted">••••••••</span>
                <Button 
                  icon="pi pi-copy" 
                  class="p-button-text p-button-sm"
                  @click="copyApiKey(data.key)"
                />
              </template>
            </Column>
            <Column field="expiration" header="Expiration">
              <template #body="{ data }">
                {{ data.expiration ? new Date(data.expiration).toLocaleDateString() : 'Never' }}
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger"
                  @click="deleteApiKey(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </div>
  </div>

  <!-- API Key Dialog -->
  <Dialog 
    v-model:visible="showNewApiKeyDialog" 
    header="Generate New API Key" 
    :modal="true"
    :style="{ width: '450px' }"
  >
    <div class="field">
      <label for="apiKeyName">Name</label>
      <InputText
        id="apiKeyName"
        v-model="newApiKey.name"
        class="w-full"
        placeholder="Enter a name for this API key"
      />
    </div>
    <div class="field">
      <label for="apiKeyExpiration">Expiration (Optional)</label>
      <Calendar
        id="apiKeyExpiration"
        v-model="newApiKey.expiration"
        class="w-full"
        :showIcon="true"
        dateFormat="yy-mm-dd"
        placeholder="Select expiration date"
      />
    </div>
    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        class="p-button-text" 
        @click="showNewApiKeyDialog = false"
      />
      <Button 
        label="Generate" 
        icon="pi pi-check" 
        :loading="generatingApiKey"
        @click="generateApiKey"
      />
    </template>
  </Dialog>

  <!-- URL Action Dialog -->
  <Dialog 
    v-model:visible="showUrlActionDialog" 
    :header="editingUrlAction ? 'Edit URL Action' : 'Add URL Action'" 
    :modal="true"
    :style="{ width: '600px' }"
  >
    <div class="field">
      <label for="urlActionName">Name</label>
      <InputText
        id="urlActionName"
        v-model="urlActionForm.name"
        class="w-full"
        placeholder="Enter a name for this action"
      />
    </div>
    <div class="field">
      <label for="urlActionDesc">Description</label>
      <Textarea
        id="urlActionDesc"
        v-model="urlActionForm.desc"
        class="w-full"
        rows="2"
        placeholder="Enter a description"
      />
    </div>
    <div class="field">
      <label for="urlActionPattern">Pattern</label>
      <InputText
        id="urlActionPattern"
        v-model="urlActionForm.pattern"
        class="w-full"
        placeholder="Enter URL pattern"
      />
    </div>
    <div class="field">
      <label for="urlActionType">Type</label>
      <Dropdown
        id="urlActionType"
        v-model="urlActionForm.action_type"
        :options="['rest', 'web']"
        class="w-full"
        placeholder="Select action type"
      />
    </div>
    <div v-if="urlActionForm.action_type === 'rest'" class="field">
      <label for="urlActionMethod">Method</label>
      <Dropdown
        id="urlActionMethod"
        v-model="urlActionForm.rest_method"
        :options="['get', 'post', 'put', 'patch', 'delete']"
        class="w-full"
        placeholder="Select HTTP method"
      />
    </div>
    <div v-if="urlActionForm.action_type === 'rest'" class="field">
      <label for="urlActionBody">Request Body</label>
      <Textarea
        id="urlActionBody"
        v-model="urlActionForm.rest_body"
        class="w-full"
        rows="3"
        placeholder="Enter request body (JSON)"
      />
    </div>
    <div v-if="urlActionForm.action_type === 'rest'" class="field">
      <label for="urlActionHeaders">Request Headers</label>
      <Textarea
        id="urlActionHeaders"
        v-model="urlActionForm.rest_headers"
        class="w-full"
        rows="3"
        placeholder="Enter request headers (JSON)"
      />
    </div>
    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        class="p-button-text" 
        @click="closeUrlActionDialog"
      />
      <Button 
        label="Save" 
        icon="pi pi-check" 
        :loading="savingUrlAction"
        @click="saveUrlAction"
      />
    </template>
  </Dialog>

  <!-- Key Store Dialog -->
  <Dialog 
    v-model:visible="showKeyStoreDialog" 
    :header="editingKeyStore ? 'Edit Key' : 'Add Key'" 
    :modal="true"
    :style="{ width: '450px' }"
  >
    <div class="field">
      <label for="keyStoreName">Name</label>
      <InputText
        id="keyStoreName"
        v-model="keyStoreForm.name"
        class="w-full"
        placeholder="Enter a name for this key"
      />
    </div>
    <div class="field">
      <label for="keyStoreValue">Value</label>
      <Password
        id="keyStoreValue"
        v-model="keyStoreForm.value"
        class="w-full"
        :feedback="false"
        toggleMask
        placeholder="Enter the key value"
      />
    </div>
    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        class="p-button-text" 
        @click="showKeyStoreDialog = false"
      />
      <Button 
        label="Save" 
        icon="pi pi-check" 
        :loading="savingKeyStore"
        @click="saveKeyStore"
      />
    </template>
  </Dialog>

  <!-- Custom Field Dialog -->
  <Dialog 
    v-model:visible="showCustomFieldDialog" 
    :header="editingCustomField ? 'Edit Custom Field' : 'Add Custom Field'" 
    :modal="true"
    :style="{ width: '450px' }"
  >
    <div class="field">
      <label for="customFieldName">Name</label>
      <InputText
        id="customFieldName"
        v-model="customFieldForm.name"
        class="w-full"
        placeholder="Enter a name for this field"
      />
    </div>
    <div class="field">
      <label for="customFieldModel">Model</label>
      <Dropdown
        id="customFieldModel"
        v-model="customFieldForm.model"
        :options="['client', 'site', 'agent']"
        class="w-full"
        placeholder="Select model"
      />
    </div>
    <div class="field">
      <label for="customFieldType">Type</label>
      <Dropdown
        id="customFieldType"
        v-model="customFieldForm.type"
        :options="['text', 'number', 'boolean', 'select']"
        class="w-full"
        placeholder="Select field type"
      />
    </div>
    <div class="field">
      <label for="customFieldRequired">Required</label>
      <div class="flex align-items-center">
        <InputSwitch
          id="customFieldRequired"
          v-model="customFieldForm.required"
        />
        <span class="ml-2">{{ customFieldForm.required ? 'Yes' : 'No' }}</span>
      </div>
    </div>
    <div v-if="customFieldForm.type === 'select'" class="field">
      <label for="customFieldOptions">Options (comma-separated)</label>
      <InputText
        id="customFieldOptions"
        v-model="customFieldForm.options"
        class="w-full"
        placeholder="Enter options separated by commas"
      />
    </div>
    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        class="p-button-text" 
        @click="showCustomFieldDialog = false"
      />
      <Button 
        label="Save" 
        icon="pi pi-check" 
        :loading="savingCustomField"
        @click="saveCustomField"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import Dropdown from 'primevue/dropdown';
import Chips from 'primevue/chips';
import Password from 'primevue/password';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Textarea from 'primevue/textarea';

interface UrlAction {
  id: number;
  name: string;
  desc: string;
  pattern: string;
  action_type: 'rest' | 'web';
  rest_method: string;
  rest_body: string;
  rest_headers: string;
}

interface KeyStore {
  id: number;
  name: string;
  value: string;
}

interface CustomField {
  id: number;
  name: string;
  model: string;
  type: string;
  required: boolean;
  options: string[];
}

interface ApiKey {
  id: number;
  name: string;
  key: string;
  expiration: string | null;
}

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

// Dialog refs
const showNewApiKeyDialog = ref(false);
const showUrlActionDialog = ref(false);
const showKeyStoreDialog = ref(false);
const showCustomFieldDialog = ref(false);

// Form refs
const editingUrlAction = ref<UrlAction | null>(null);
const editingKeyStore = ref<KeyStore | null>(null);
const editingCustomField = ref<CustomField | null>(null);
const newApiKey = ref({
  name: '',
  expiration: null as Date | null
});

const urlActionForm = ref({
  name: '',
  desc: '',
  pattern: '',
  action_type: 'rest' as 'rest' | 'web',
  rest_method: 'get',
  rest_body: '',
  rest_headers: ''
});

const keyStoreForm = ref({
  name: '',
  value: ''
});

const customFieldForm = ref({
  name: '',
  model: '',
  type: '',
  required: false,
  options: ''
});

// State refs
const generatingApiKey = ref(false);
const savingUrlAction = ref(false);
const savingKeyStore = ref(false);
const savingCustomField = ref(false);

// Computed
const allUrlActions = computed(() => {
  const urlActions = props.settings.url_actions || [];
  const webhooks = props.settings.webhooks || [];
  return [...urlActions, ...webhooks];
});

const toastService = ToastService.getInstance();

// Methods
const copyApiKey = (key: string) => {
  navigator.clipboard.writeText(key);
  toastService.showSuccess('API key copied to clipboard');
};

const copyKeyStore = (value: string) => {
  navigator.clipboard.writeText(value);
  toastService.showSuccess('Key value copied to clipboard');
};

const editUrlAction = (action: UrlAction) => {
  editingUrlAction.value = action;
  showUrlActionDialog.value = true;
};

const editKeyStore = (key: KeyStore) => {
  editingKeyStore.value = key;
  showKeyStoreDialog.value = true;
};

const editCustomField = (field: CustomField) => {
  editingCustomField.value = field;
  showCustomFieldDialog.value = true;
};

const deleteUrlAction = async (id: number) => {
  try {
    await restClient.delete(`${envConfig.GATEWAY_URL}/tools/tactical-rmm/core/urlaction/${id}/`);
    props.settings.url_actions = props.settings.url_actions?.filter((a: UrlAction) => a.id !== id);
    props.settings.webhooks = props.settings.webhooks?.filter((w: UrlAction) => w.id !== id);
    toastService.showSuccess('URL Action deleted successfully');
  } catch (err: any) {
    console.error('Error deleting:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete';
    toastService.showError(message);
  }
};

const deleteKeyStore = async (id: number) => {
  try {
    await restClient.delete(`${envConfig.GATEWAY_URL}/tools/tactical-rmm/core/keystore/${id}/`);
    props.settings.key_store = props.settings.key_store?.filter((k: KeyStore) => k.id !== id);
    toastService.showSuccess('Key deleted successfully');
  } catch (err: any) {
    console.error('Error deleting key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete key';
    toastService.showError(message);
  }
};

const deleteCustomField = async (id: number) => {
  try {
    await restClient.delete(`${envConfig.GATEWAY_URL}/tools/tactical-rmm/core/customfields/${id}/`);
    props.settings.custom_fields = props.settings.custom_fields?.filter((f: CustomField) => f.id !== id);
    toastService.showSuccess('Custom field deleted successfully');
  } catch (err: any) {
    console.error('Error deleting custom field:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete custom field';
    toastService.showError(message);
  }
};

const deleteApiKey = async (id: number) => {
  try {
    await restClient.delete(`${envConfig.GATEWAY_URL}/tools/tactical-rmm/accounts/apikeys/${id}/`);
    props.settings.api_keys = props.settings.api_keys?.filter((k: ApiKey) => k.id !== id);
    toastService.showSuccess('API key deleted successfully');
  } catch (err: any) {
    console.error('Error deleting API key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete API key';
    toastService.showError(message);
  }
};

const generateApiKey = async () => {
  if (!newApiKey.value.name) {
    toastService.showError('Please enter a name for the API key');
    return;
  }

  generatingApiKey.value = true;
  try {
    const response = await restClient.post<ApiKey>(`${envConfig.GATEWAY_URL}/tools/tactical-rmm/accounts/apikeys/`, {
      name: newApiKey.value.name,
      expiration: newApiKey.value.expiration?.toISOString() || null
    });
    
    if (!props.settings.api_keys) {
      props.settings.api_keys = [];
    }
    props.settings.api_keys.push(response);
    
    showNewApiKeyDialog.value = false;
    newApiKey.value = { name: '', expiration: null };
    toastService.showSuccess('API key generated successfully');
  } catch (err: any) {
    console.error('Error generating API key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to generate API key';
    toastService.showError(message);
  } finally {
    generatingApiKey.value = false;
  }
};

const saveUrlAction = async () => {
  if (!urlActionForm.value.name || !urlActionForm.value.pattern) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingUrlAction.value = true;
  try {
    const endpoint = '/core/urlaction/';
    const method = editingUrlAction.value ? 'patch' : 'post';
    const url = editingUrlAction.value 
      ? `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}${editingUrlAction.value.id}/`
      : `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}`;

    const response = await restClient[method]<UrlAction>(url, urlActionForm.value);
    
    if (editingUrlAction.value) {
      const index = allUrlActions.value.findIndex(a => a.id === editingUrlAction.value?.id);
      if (index !== -1) {
        if (response.action_type === 'web') {
          props.settings.webhooks = props.settings.webhooks?.map((w: UrlAction) => 
            w.id === response.id ? response : w
          );
        } else {
          props.settings.url_actions = props.settings.url_actions?.map((a: UrlAction) => 
            a.id === response.id ? response : a
          );
        }
      }
    } else {
      if (response.action_type === 'web') {
        if (!props.settings.webhooks) props.settings.webhooks = [];
        props.settings.webhooks.push(response);
      } else {
        if (!props.settings.url_actions) props.settings.url_actions = [];
        props.settings.url_actions.push(response);
      }
    }
    
    closeUrlActionDialog();
    toastService.showSuccess('URL Action saved successfully');
  } catch (err: any) {
    console.error('Error saving:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save';
    toastService.showError(message);
  } finally {
    savingUrlAction.value = false;
  }
};

const closeUrlActionDialog = () => {
  showUrlActionDialog.value = false;
  editingUrlAction.value = null;
  urlActionForm.value = {
    name: '',
    desc: '',
    pattern: '',
    action_type: 'rest',
    rest_method: 'get',
    rest_body: '',
    rest_headers: ''
  };
};

const saveKeyStore = async () => {
  if (!keyStoreForm.value.name || !keyStoreForm.value.value) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingKeyStore.value = true;
  try {
    const endpoint = '/core/keystore/';
    const method = editingKeyStore.value ? 'patch' : 'post';
    const url = editingKeyStore.value 
      ? `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}${editingKeyStore.value.id}/`
      : `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}`;

    const response = await restClient[method]<KeyStore>(url, keyStoreForm.value);
    
    if (editingKeyStore.value) {
      props.settings.key_store = props.settings.key_store?.map((k: KeyStore) => 
        k.id === response.id ? response : k
      );
    } else {
      if (!props.settings.key_store) props.settings.key_store = [];
      props.settings.key_store.push(response);
    }
    
    showKeyStoreDialog.value = false;
    toastService.showSuccess('Key saved successfully');
  } catch (err: any) {
    console.error('Error saving key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save key';
    toastService.showError(message);
  } finally {
    savingKeyStore.value = false;
  }
};

const saveCustomField = async () => {
  if (!customFieldForm.value.name || !customFieldForm.value.model || !customFieldForm.value.type) {
    toastService.showError('Please fill in all required fields');
    return;
  }

  savingCustomField.value = true;
  try {
    const endpoint = '/core/customfields/';
    const method = editingCustomField.value ? 'patch' : 'post';
    const url = editingCustomField.value 
      ? `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}${editingCustomField.value.id}/`
      : `${envConfig.GATEWAY_URL}/tools/tactical-rmm${endpoint}`;

    const formData = {
      ...customFieldForm.value,
      options: customFieldForm.value.options.split(',').map(opt => opt.trim()).filter(Boolean)
    };

    const response = await restClient[method]<CustomField>(url, formData);
    
    if (editingCustomField.value) {
      props.settings.custom_fields = props.settings.custom_fields?.map((f: CustomField) => 
        f.id === response.id ? response : f
      );
    } else {
      if (!props.settings.custom_fields) props.settings.custom_fields = [];
      props.settings.custom_fields.push(response);
    }
    
    showCustomFieldDialog.value = false;
    toastService.showSuccess('Custom field saved successfully');
  } catch (err: any) {
    console.error('Error saving custom field:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save custom field';
    toastService.showError(message);
  } finally {
    savingCustomField.value = false;
  }
};
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

:deep(.p-datatable) {
  font-size: 0.9rem;
}

:deep(.p-datatable .p-datatable-header) {
  background: transparent;
  border: none;
  padding: 0;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-ground);
  color: var(--text-color-secondary);
  font-weight: 600;
  padding: 0.75rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.75rem;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: var(--surface-hover);
}

:deep(.p-button-text) {
  padding: 0.25rem;
}

:deep(.p-button-text:hover) {
  background: var(--surface-hover);
}

:deep(.p-tag) {
  text-transform: capitalize;
}
</style> 