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
            @update:modelValue="(val: string) => saveConfigProperty('default_time_zone', null, val)"
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
            @update:modelValue="(val: string) => saveConfigProperty('agent_debug_level', null, val)"
          />
        </div>

        <div class="field">
          <label for="agentAutoUpdate">Agent Auto Update</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="agentAutoUpdate"
              v-model="settings.agent_auto_update"
              @change="(event: Event) => saveConfigProperty('agent_auto_update', null, (event.target as HTMLInputElement).checked)"
            />
            <span class="ml-2">{{ settings.agent_auto_update ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>

        <div class="alert-section">
          <h3 class="section-title">Cleanup Settings</h3>
          <div class="section-content">
            <div class="field">
              <label for="checkHistoryPrune">Check History Prune Days</label>
              <InputNumber
                id="checkHistoryPrune"
                v-model="settings.check_history_prune_days"
                :min="0"
                class="w-full"
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('check_history_prune_days', null, val)"
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
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('resolved_alerts_prune_days', null, val)"
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
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('agent_history_prune_days', null, val)"
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
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('debug_log_prune_days', null, val)"
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
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('audit_log_prune_days', null, val)"
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
                :showButtons="false"
                :useGrouping="false"
                @update:modelValue="(val: number | null) => saveConfigProperty('clear_faults_days', null, val)"
              />
              <small>Days after which to automatically clear faults (0 to disable)</small>
            </div>
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
              @update:modelValue="(val: boolean) => saveConfigProperty('notify_on_warning_alerts', null, val)"
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
              @update:modelValue="(val: boolean) => saveConfigProperty('notify_on_info_alerts', null, val)"
            />
            <span class="ml-2">{{ settings.notify_on_info_alerts ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </div>

        <div class="alert-section">
          <h3 class="section-title">Email Alerts</h3>
          <div class="section-content">
            <div class="field">
              <label for="smtpFromEmail">From Email</label>
              <InputText
                id="smtpFromEmail"
                v-model="settings.smtp_from_email"
                class="w-full"
                @change="(event: Event) => saveConfigProperty('smtp_from_email', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="smtpFromName">From Name</label>
              <InputText
                id="smtpFromName"
                v-model="settings.smtp_from_name"
                class="w-full"
                @change="(event: Event) => saveConfigProperty('smtp_from_name', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="smtpHost">SMTP Host</label>
              <InputText
                id="smtpHost"
                v-model="settings.smtp_host"
                class="w-full"
                @change="(event: Event) => saveConfigProperty('smtp_host', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="smtpPort">SMTP Port</label>
              <InputNumber
                id="smtpPort"
                v-model="settings.smtp_port"
                class="w-full"
                @update:modelValue="(val: number | null) => saveConfigProperty('smtp_port', null, val)"
              />
            </div>

            <div class="field">
              <label for="smtpRequiresAuth">SMTP Authentication</label>
              <div class="flex align-items-center">
                <InputSwitch
                  id="smtpRequiresAuth"
                  v-model="settings.smtp_requires_auth"
                  @update:modelValue="(val: boolean) => saveConfigProperty('smtp_requires_auth', null, val)"
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
                @change="(event: Event) => saveConfigProperty('smtp_host_user', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div v-if="settings.smtp_requires_auth" class="field">
              <label for="smtpPassword">SMTP Password</label>
              <Password
                id="smtpPassword"
                v-model="settings.smtp_host_password"
                class="w-full"
                :feedback="false"
                toggleMask
                @change="(event: Event) => saveConfigProperty('smtp_host_password', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="emailRecipients">Email Alert Recipients</label>
              <div class="recipients-list">
                <div v-for="(recipient, index) in settings.email_alert_recipients" :key="index" class="recipient-item">
                  <span>{{ recipient }}</span>
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    @click="removeEmailRecipient(index)"
                  />
                </div>
                <div class="recipient-input">
                  <InputText
                    v-model="newEmailRecipient"
                    class="w-full"
                    placeholder="Enter email and press Enter"
                    @keyup.enter="addEmailRecipient"
                  />
                  <Button 
                    icon="pi pi-plus" 
                    class="p-button-text p-button-sm"
                    @click="addEmailRecipient"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="alert-section">
          <h3 class="section-title">SMS Alerts</h3>
          <div class="section-content">
            <div class="field">
              <label for="twilioNumber">Twilio Number</label>
              <InputText
                id="twilioNumber"
                v-model="settings.twilio_number"
                class="w-full"
                @change="(event: Event) => saveConfigProperty('twilio_number', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="twilioAccountSid">Twilio Account SID</label>
              <InputText
                id="twilioAccountSid"
                v-model="settings.twilio_account_sid"
                class="w-full"
                @change="(event: Event) => saveConfigProperty('twilio_account_sid', null, (event.target as HTMLInputElement).value)"
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
                @change="(event: Event) => saveConfigProperty('twilio_auth_token', null, (event.target as HTMLInputElement).value)"
              />
            </div>

            <div class="field">
              <label for="smsRecipients">SMS Alert Recipients</label>
              <div class="recipients-list">
                <div v-for="(recipient, index) in settings.sms_alert_recipients" :key="index" class="recipient-item">
                  <span>{{ recipient }}</span>
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    @click="removeRecipient(index)"
                  />
                </div>
                <div class="recipient-input">
                  <InputText
                    v-model="newRecipient"
                    class="w-full"
                    placeholder="Enter phone number and press Enter"
                    @keyup.enter="addRecipient"
                  />
                  <Button 
                    icon="pi pi-plus" 
                    class="p-button-text p-button-sm"
                    @click="addRecipient"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="category === 'custom_fields'">
        <div class="field">
          <div class="flex justify-content-end align-items-center mb-3">
            <Button 
              icon="pi pi-plus" 
              label="Add Field"
              severity="success"
              @click="showCustomFieldDialog = true"
            />
          </div>

          <ModuleTable
            :items="settings.custom_fields || []"
            :loading="loading"
            :searchFields="['name', 'model', 'type']"
            emptyIcon="pi pi-list"
            emptyTitle="No Custom Fields"
            :paginator="false"
            :scrollable="true"
            class="settings-table"
          >
            <Column field="name" header="Name" sortable>
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
            </Column>
            <Column field="model" header="Model" sortable>
              <template #body="{ data }">
                <Tag :value="data.model" :severity="getModelSeverity(data.model)" />
              </template>
            </Column>
            <Column field="type" header="Type" sortable>
              <template #body="{ data }">
                <Tag :value="data.type" :severity="getTypeSeverity(data.type)" />
              </template>
            </Column>
            <Column field="required" header="Required" sortable>
              <template #body="{ data }">
                <span>{{ data.required ? 'Yes' : 'No' }}</span>
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <div class="flex gap-2 justify-content-center">
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    v-tooltip.top="'Delete Field'"
                    @click="confirmDelete('custom_fields', data.id)"
                  />
                </div>
              </template>
            </Column>
          </ModuleTable>
        </div>
      </template>

      <template v-else-if="category === 'key_store'">
        <div class="field">
          <div class="flex justify-content-end align-items-center mb-3">
            <Button 
              icon="pi pi-plus" 
              label="Add Key"
              severity="success"
              @click="showKeyStoreDialog = true"
            />
          </div>

          <ModuleTable
            :items="settings.key_store || []"
            :loading="loading"
            :searchFields="['name']"
            emptyIcon="pi pi-key"
            emptyTitle="No Keys"
            :paginator="false"
            :scrollable="true"
            class="settings-table"
          >
            <Column field="name" header="Name" sortable>
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
            </Column>
            <Column field="value" header="Value">
              <template #body="{ data }">
                <div class="flex align-items-center gap-2">
                  <span class="text-muted">••••••••</span>
                  <Button 
                    icon="pi pi-copy" 
                    class="p-button-text p-button-sm"
                    v-tooltip.top="'Copy Value'"
                    @click="copyKeyStore(data.value)"
                  />
                </div>
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <div class="flex gap-2 justify-content-center">
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    v-tooltip.top="'Delete Key'"
                    @click="confirmDelete('key_store', data.id)"
                  />
                </div>
              </template>
            </Column>
          </ModuleTable>
        </div>
      </template>

      <template v-else-if="category === 'url_actions'">
        <div class="field">
          <div class="flex justify-content-end align-items-center mb-3">
            <Button 
              icon="pi pi-plus" 
              label="Add Action"
              severity="success"
              @click="showUrlActionDialog = true"
            />
          </div>

          <ModuleTable
            :items="allUrlActions"
            :loading="loading"
            :searchFields="['name', 'desc', 'pattern']"
            emptyIcon="pi pi-link"
            emptyTitle="No Actions"
            :paginator="false"
            :scrollable="true"
            class="settings-table"
          >
            <Column field="name" header="Name" sortable>
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
            </Column>
            <Column field="desc" header="Description" sortable>
              <template #body="{ data }">
                <span class="text-sm">{{ data.desc }}</span>
              </template>
            </Column>
            <Column field="pattern" header="Pattern" sortable>
              <template #body="{ data }">
                <span class="text-sm">{{ data.pattern }}</span>
              </template>
            </Column>
            <Column field="action_type" header="Type" sortable>
              <template #body="{ data }">
                <Tag :value="data.action_type" :severity="data.action_type === 'web' ? 'info' : 'warning'" />
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <div class="flex gap-2 justify-content-center">
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    v-tooltip.top="'Delete Action'"
                    @click="confirmDelete('url_actions', data.id)"
                  />
                </div>
              </template>
            </Column>
          </ModuleTable>
        </div>
      </template>

      <template v-else-if="category === 'api_keys'">
        <div class="field">
          <div class="flex justify-content-end align-items-center mb-3">
            <Button 
              icon="pi pi-plus" 
              label="Generate Key"
              severity="success"
              @click="showNewApiKeyDialog = true"
            />
          </div>

          <ModuleTable
            :items="settings.api_keys || []"
            :loading="loading"
            :searchFields="['name']"
            emptyIcon="pi pi-key"
            emptyTitle="No API Keys"
            :paginator="false"
            :scrollable="true"
            class="settings-table"
          >
            <Column field="name" header="Name" sortable>
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
            </Column>
            <Column field="key" header="Key">
              <template #body="{ data }">
                <div class="flex align-items-center gap-2">
                  <span class="text-muted">••••••••</span>
                  <Button 
                    icon="pi pi-copy" 
                    class="p-button-text p-button-sm"
                    v-tooltip.top="'Copy Key'"
                    @click="copyApiKey(data.key)"
                  />
                </div>
              </template>
            </Column>
            <Column field="expiration" header="Expiration" sortable>
              <template #body="{ data }">
                <span class="text-sm">{{ data.expiration ? new Date(data.expiration).toLocaleDateString() : 'Never' }}</span>
              </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
              <template #body="{ data }">
                <div class="flex gap-2 justify-content-center">
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-sm p-button-danger"
                    v-tooltip.top="'Delete API Key'"
                    @click="confirmDelete('api_keys', data.id)"
                  />
                </div>
              </template>
            </Column>
          </ModuleTable>
        </div>
      </template>
    </div>
  </div>

  <!-- API Key Dialog -->
  <Dialog 
    v-model:visible="showNewApiKeyDialog" 
    header="Generate New API Key" 
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid">
      <div class="col-12">
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
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
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
      </div>
    </template>
  </Dialog>

  <!-- URL Action Dialog -->
  <Dialog 
    v-model:visible="showUrlActionDialog" 
    :header="editingUrlAction ? 'Edit URL Action' : 'Add URL Action'" 
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid">
      <div class="col-12">
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
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
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
      </div>
    </template>
  </Dialog>

  <!-- Key Store Dialog -->
  <Dialog 
    v-model:visible="showKeyStoreDialog" 
    :header="editingKeyStore ? 'Edit Key' : 'Add Key'" 
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid">
      <div class="col-12">
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
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
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
      </div>
    </template>
  </Dialog>

  <!-- Custom Field Dialog -->
  <Dialog 
    v-model:visible="showCustomFieldDialog" 
    :header="editingCustomField ? 'Edit Custom Field' : 'Add Custom Field'" 
    :modal="true"
    :draggable="false"
    :style="{ width: '60vw', maxWidth: '800px' }"
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid">
      <div class="col-12">
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
            :options="['text', 'number', 'boolean', 'select', 'datetime']"
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
        <div v-if="customFieldForm.type === 'text'" class="field">
          <label for="defaultValueString">Default Value</label>
          <InputText
            id="defaultValueString"
            v-model="customFieldForm.default_value_string"
            class="w-full"
            placeholder="Enter default value"
          />
        </div>
        <div v-if="customFieldForm.type === 'boolean'" class="field">
          <label for="defaultValueBool">Default Value</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="defaultValueBool"
              v-model="customFieldForm.default_value_bool"
            />
            <span class="ml-2">{{ customFieldForm.default_value_bool ? 'Yes' : 'No' }}</span>
          </div>
        </div>
        <div class="field">
          <label for="hideInUI">Hide in UI</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="hideInUI"
              v-model="customFieldForm.hide_in_ui"
            />
            <span class="ml-2">{{ customFieldForm.hide_in_ui ? 'Yes' : 'No' }}</span>
          </div>
        </div>
        <div class="field">
          <label for="hideInSummary">Hide in Summary</label>
          <div class="flex align-items-center">
            <InputSwitch
              id="hideInSummary"
              v-model="customFieldForm.hide_in_summary"
            />
            <span class="ml-2">{{ customFieldForm.hide_in_summary ? 'Yes' : 'No' }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
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
      </div>
    </template>
  </Dialog>

  <!-- Delete Confirmation Dialog -->
  <Dialog 
    v-model:visible="deleteDialog" 
    header="Confirm" 
    :modal="true" 
    :draggable="false"
    :style="{ width: '450px' }" 
    class="p-dialog-custom"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="confirmation-content">
      <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
      <span v-if="deleteType && deleteId">
        Are you sure you want to delete this {{ deleteType.replace('_', ' ') }}?
      </span>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button 
          label="No" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="deleteDialog = false"
        />
        <Button 
          label="Yes" 
          icon="pi pi-check" 
          class="p-button-danger" 
          @click="handleDelete" 
          :loading="deleting"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from '@vue/runtime-core';
import type { ComputedRef, WatchSource } from '@vue/runtime-core';
import { useRoute } from 'vue-router';
import { restClient } from '../../apollo/apolloClient';
import { ConfigService } from '../../config/config.service';
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
import ModuleTable from '../../components/shared/ModuleTable.vue';
import { useToast } from 'primevue/usetoast';
import type { RMMSettings, DynamicSettings, ApiKey, UrlAction, KeyStore, CustomField } from '../../types/settings';
import NestedObjectEditor from '../../components/NestedObjectEditor.vue';
import type { EditableValue } from '../mdm/Settings.vue';
import type { DropdownChangeEvent } from 'primevue/dropdown';
import { useQuery, provideApolloClient } from '@vue/apollo-composable';
import { apolloClient } from '../../apollo/apolloClient';
import gql from 'graphql-tag';

interface Props {
  category: string;
  settings: DynamicSettings<RMMSettings>;
  saveSettings: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  hasChanges: boolean;
  changedValues: Record<string, any>;
  formatKey: (key: string) => string;
  hasPropertyChanges: (category: string) => boolean;
  isSaving: (category: string) => boolean;
  saveConfigProperty: (key: string, subKey: string | null, value: any) => void;
}

const props = defineProps<Props>();

const route = useRoute();
const category = computed(() => route.params.category as string);
const loading = ref(false);
const newRecipient = ref('');
const newEmailRecipient = ref('');

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
  options: '',
  default_value_string: '',
  default_value_bool: false,
  default_values_multiple: [] as string[],
  hide_in_ui: false,
  hide_in_summary: false
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

const configService = ConfigService.getInstance();
const config = configService.getConfig();
const VITE_API_URL = `${config.gatewayUrl}/tools/tactical-rmm`;
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
  customFieldForm.value = {
    name: field.name,
    model: field.model,
    type: field.type,
    required: field.required,
    options: field.options.join(', '),
    default_value_string: field.default_value_string,
    default_value_bool: field.default_value_bool,
    default_values_multiple: field.default_values_multiple,
    hide_in_ui: field.hide_in_ui,
    hide_in_summary: field.hide_in_summary
  };
  showCustomFieldDialog.value = true;
};

const deleteUrlAction = async (id: number) => {
  try {
    await restClient.delete(`${config.gatewayUrl}/tools/tactical-rmm/core/urlaction/${id}/`);
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
    await restClient.delete(`${config.gatewayUrl}/tools/tactical-rmm/core/keystore/${id}/`);
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
    await restClient.delete(`${config.gatewayUrl}/tools/tactical-rmm/core/customfields/${id}/`);
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
    if (id === 1) {
      toastService.showError('Cannot delete the default API key');
      return;
    }

    await restClient.delete(`${config.gatewayUrl}/tools/tactical-rmm/accounts/apikeys/${id}/`);
    props.settings.api_keys = props.settings.api_keys?.filter((k: ApiKey) => k.id !== id);
    toastService.showSuccess('API key deleted successfully');
  } catch (err: any) {
    console.error('Error deleting API key:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete API key';
    toastService.showError(message);
  }
};

// Provide Apollo client at component level
provideApolloClient(apolloClient);

const INTEGRATED_TOOLS_QUERY = gql`
  query GetIntegratedTools($filter: ToolFilter) {
    integratedTools(filter: $filter) {
      id
      name
      description
      icon
      toolUrls {
        url
        port
        type
      }
      type
      toolType
      category
      platformCategory
      enabled
      credentials {
        username
        password
        apiKey {
          key
          type
          keyName
        }
      }
      layer
      layerOrder
      layerColor
      metricsPath
      healthCheckEndpoint
      healthCheckInterval
      connectionTimeout
      readTimeout
      allowedEndpoints
    }
  }
`;

interface TacticalRmmUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
  last_login_ip: string;
  role: number;
  block_dashboard_login: boolean;
  date_format: string | null;
  social_accounts: any[];
}

const generateApiKey = async () => {
  if (!newApiKey.value.name) {
    toastService.showError('Please enter a name for the API key');
    return;
  }

  generatingApiKey.value = true;
  try {
    // Fetch Tactical RMM users
    const usersResponse = await restClient.get<TacticalRmmUser[]>(`${config.gatewayUrl}/tools/tactical-rmm/accounts/users/`);
    console.log('Tactical RMM Users:', usersResponse); // Debug log

    if (!usersResponse || !usersResponse.length) {
      throw new Error('Could not find any Tactical RMM users');
    }

    const firstUser = usersResponse[0];
    console.log('Using first user:', firstUser); // Debug log

    const response = await restClient.post<ApiKey>(`${config.gatewayUrl}/tools/tactical-rmm/accounts/apikeys/`, {
      name: newApiKey.value.name,
      expiration: newApiKey.value.expiration?.toISOString() || null,
      user: firstUser.id
    });
    
    if (!props.settings.api_keys) {
      props.settings.api_keys = [];
    }
    props.settings.api_keys.push(response);
    
    showNewApiKeyDialog.value = false;
    newApiKey.value = { name: '', expiration: null };
    toastService.showSuccess('API key generated successfully');
    
    // Refetch API keys after adding
    const apiKeysResponse = await restClient.get<ApiKey[]>(`${config.gatewayUrl}/tools/tactical-rmm/accounts/apikeys/`);
    props.settings.api_keys = apiKeysResponse;
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
      ? `${VITE_API_URL}${endpoint}${editingUrlAction.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

    const response = await restClient[method]<UrlAction>(url, urlActionForm.value);
    
    if (editingUrlAction.value) {
      const index = allUrlActions.value.findIndex((a: UrlAction) => a.id === editingUrlAction.value?.id);
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
    
    // Refetch URL actions after adding/editing
    const urlActionsResponse = await restClient.get<UrlAction[]>(`${VITE_API_URL}/core/urlaction/`);
    props.settings.url_actions = urlActionsResponse;
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
      ? `${VITE_API_URL}${endpoint}${editingKeyStore.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

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
    
    // Refetch key store after adding/editing
    const keyStoreResponse = await restClient.get<KeyStore[]>(`${VITE_API_URL}/core/keystore/`);
    props.settings.key_store = keyStoreResponse;
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
      ? `${VITE_API_URL}${endpoint}${editingCustomField.value.id}/`
      : `${VITE_API_URL}${endpoint}`;

    const formData = {
      name: customFieldForm.value.name,
      model: customFieldForm.value.model,
      type: customFieldForm.value.type,
      required: customFieldForm.value.required,
      options: customFieldForm.value.options.split(',').map(opt => opt.trim()).filter(Boolean),
      default_value_string: customFieldForm.value.default_value_string,
      default_value_bool: customFieldForm.value.default_value_bool,
      default_values_multiple: customFieldForm.value.default_values_multiple,
      hide_in_ui: customFieldForm.value.hide_in_ui,
      hide_in_summary: customFieldForm.value.hide_in_summary
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
    
    // Refetch custom fields after adding/editing
    const customFieldsResponse = await restClient.get<CustomField[]>(`${VITE_API_URL}/core/customfields/`);
    props.settings.custom_fields = customFieldsResponse;
  } catch (err: any) {
    console.error('Error saving custom field:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save custom field';
    toastService.showError(message);
  } finally {
    savingCustomField.value = false;
  }
};

const getModelSeverity = (model: string) => {
  const severityMap: Record<string, string> = {
    client: 'info',
    site: 'warning',
    agent: 'success'
  };
  return severityMap[model] || 'info';
};

const getTypeSeverity = (type: string) => {
  const severityMap: Record<string, string> = {
    text: 'info',
    number: 'warning',
    boolean: 'success',
    select: 'info',
    datetime: 'warning'
  };
  return severityMap[type] || 'info';
};

// Add this after the category computed property
watch(category as WatchSource<string>, async (newCategory: string) => {
  try {
    switch (newCategory) {
      case 'custom_fields':
        const customFieldsResponse = await restClient.get<CustomField[]>(`${VITE_API_URL}/core/customfields/`);
        props.settings.custom_fields = customFieldsResponse;
        break;
      case 'api_keys':
        const apiKeysResponse = await restClient.get<ApiKey[]>(`${VITE_API_URL}/accounts/apikeys/`);
        props.settings.api_keys = apiKeysResponse;
        break;
      case 'key_store':
        const keyStoreResponse = await restClient.get<KeyStore[]>(`${VITE_API_URL}/core/keystore/`);
        props.settings.key_store = keyStoreResponse;
        break;
      case 'url_actions':
        const urlActionsResponse = await restClient.get<UrlAction[]>(`${VITE_API_URL}/core/urlaction/`);
        props.settings.url_actions = urlActionsResponse;
        break;
    }
  } catch (err: any) {
    console.error(`Error fetching ${newCategory}:`, err);
    const message = err.response?.data?.message || err.message || `Failed to fetch ${newCategory}`;
    toastService.showError(message);
  }
}, { immediate: true });

const filters = ref({
  global: { value: null, matchMode: 'contains' }
});

const filterGlobal = (value: any, filter: any) => {
  if (filter === null) return true;
  return value.toString().toLowerCase().includes(filter.toLowerCase());
};

const rowClass = (data: any) => {
  return {
    'cursor-pointer': true
  };
};

const addRecipient = () => {
  if (!newRecipient.value) return;
  
  if (!props.settings.sms_alert_recipients) {
    props.settings.sms_alert_recipients = [];
  }
  
  props.settings.sms_alert_recipients.push(newRecipient.value);
  newRecipient.value = '';
  props.saveConfigProperty('sms_alert_recipients', null, props.settings.sms_alert_recipients);
};

const removeRecipient = (index: number) => {
  if (props.settings.sms_alert_recipients) {
    props.settings.sms_alert_recipients.splice(index, 1);
    props.saveConfigProperty('sms_alert_recipients', null, props.settings.sms_alert_recipients);
  }
};

const addEmailRecipient = () => {
  if (!newEmailRecipient.value) return;
  
  if (!props.settings.email_alert_recipients) {
    props.settings.email_alert_recipients = [];
  }
  
  props.settings.email_alert_recipients.push(newEmailRecipient.value);
  newEmailRecipient.value = '';
  props.saveConfigProperty('email_alert_recipients', null, props.settings.email_alert_recipients);
};

const removeEmailRecipient = (index: number) => {
  if (props.settings.email_alert_recipients) {
    props.settings.email_alert_recipients.splice(index, 1);
    props.saveConfigProperty('email_alert_recipients', null, props.settings.email_alert_recipients);
  }
};

// Add these refs for the delete dialog
const deleteDialog = ref(false);
const deleteType = ref<string | null>(null);
const deleteId = ref<number | null>(null);
const deleting = ref(false);

// Replace the confirmDelete function with this new version
const confirmDelete = async (type: string, id: number) => {
  deleteType.value = type;
  deleteId.value = id;
  deleteDialog.value = true;
};

// Add this new function to handle the actual deletion
const handleDelete = async () => {
  if (!deleteType.value || !deleteId.value) return;

  deleting.value = true;
  try {
    switch (deleteType.value) {
      case 'custom_fields':
        await deleteCustomField(deleteId.value);
        // Refetch custom fields after deletion
        const customFieldsResponse = await restClient.get<CustomField[]>(`${VITE_API_URL}/core/customfields/`);
        props.settings.custom_fields = customFieldsResponse;
        break;
      case 'key_store':
        await deleteKeyStore(deleteId.value);
        // Refetch key store after deletion
        const keyStoreResponse = await restClient.get<KeyStore[]>(`${VITE_API_URL}/core/keystore/`);
        props.settings.key_store = keyStoreResponse;
        break;
      case 'url_actions':
        await deleteUrlAction(deleteId.value);
        // Refetch URL actions after deletion
        const urlActionsResponse = await restClient.get<UrlAction[]>(`${VITE_API_URL}/core/urlaction/`);
        props.settings.url_actions = urlActionsResponse;
        break;
      case 'api_keys':
        await deleteApiKey(deleteId.value);
        // Refetch API keys after deletion
        const apiKeysResponse = await restClient.get<ApiKey[]>(`${VITE_API_URL}/accounts/apikeys/`);
        props.settings.api_keys = apiKeysResponse;
        break;
    }
    deleteDialog.value = false;
  } catch (err: any) {
    console.error('Error deleting:', err);
    const message = err.response?.data?.message || err.message || 'Failed to delete';
    toastService.showError(message);
  } finally {
    deleting.value = false;
    deleteType.value = null;
    deleteId.value = null;
  }
};
</script>

<style scoped>
/* Only keep RMM-specific styles that don't exist in MDM */
.settings-content {
  flex: 1;
  min-width: 0;
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 2rem;
  flex-shrink: 0;
}

.settings-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.settings-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
}

.alert-section {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--card-shadow);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recipients-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recipient-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
}

.recipient-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* RMM-specific table styles */
.settings-table {
  width: 100%;
  :deep(.p-datatable) {
    width: 100%;
    .p-datatable-wrapper {
      border-radius: var(--border-radius);
      background: var(--surface-card);
    }

    .p-datatable-thead > tr > th {
      background: var(--surface-card) !important;
      color: var(--text-color-secondary) !important;
      padding: 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      border: none;
      border-bottom: 1px solid var(--surface-border);
    }

    .p-datatable-tbody > tr {
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);

      > td {
        padding: 1rem;
        border: none;
      }

      &:hover {
        background: var(--surface-hover);
      }
    }
  }
}
</style> 