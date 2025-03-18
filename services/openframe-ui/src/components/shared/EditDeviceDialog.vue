<!-- Edit Device Dialog -->
<template>
  <Dialog
    :visible="isVisible"
    @update:visible="updateVisible"
    :header="`Edit ${device?.hostname}`"
    :modal="true"
    class="p-dialog-custom"
    :style="{ width: '500px' }"
    :draggable="false"
    :pt="{
      root: { style: { position: 'relative', margin: '0 auto' } },
      mask: { style: { alignItems: 'center', justifyContent: 'center' } }
    }"
  >
    <div class="grid" v-if="device">
      <div class="col-12">
        <span class="text-sm text-500">Type</span>
        <Dropdown
          v-model="editForm.monitoring_type"
          :options="[
            { label: 'Server', value: 'server' },
            { label: 'Workstation', value: 'workstation' }
          ]"
          optionLabel="label"
          optionValue="value"
          class="w-full mt-1"
        />
      </div>
      <div class="col-12">
        <span class="text-sm text-500">Description</span>
        <InputText v-model="editForm.description" class="w-full mt-1" />
      </div>
      <div class="col-12">
        <span class="text-sm text-500">Timezone</span>
        <Dropdown
          v-model="editForm.time_zone"
          :options="timezoneOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full mt-1"
          :filter="true"
        />
      </div>
      <div class="col-12">
        <span class="text-sm text-500">Run checks every</span>
        <div class="p-inputgroup mt-1">
          <InputNumber v-model="editForm.check_interval" :min="60" :step="60" />
          <span class="p-inputgroup-addon">Seconds</span>
        </div>
      </div>
      <div class="col-12">
        <span class="text-sm text-500">Mark as offline after</span>
        <div class="p-inputgroup mt-1">
          <InputNumber v-model="editForm.offline_time" :min="1" />
          <span class="p-inputgroup-addon">Minutes</span>
        </div>
      </div>
      <div class="col-12">
        <span class="text-sm text-500">Mark as overdue after</span>
        <div class="p-inputgroup mt-1">
          <InputNumber v-model="editForm.overdue_time" :min="1" />
          <span class="p-inputgroup-addon">Minutes</span>
        </div>
      </div>
      <div class="col-12">
        <div class="flex flex-column gap-2">
          <Checkbox v-model="editForm.overdue_email_alert" :binary="true" label="Get overdue email alerts" />
          <Checkbox v-model="editForm.overdue_text_alert" :binary="true" label="Get overdue SMS alerts" />
          <Checkbox v-model="editForm.overdue_dashboard_alert" :binary="true" label="Show overdue alerts on dashboard" />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button label="Cancel" class="p-button-text" @click="onClose" />
        <Button label="Save" @click="handleSave" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

interface Device {
  agent_id: string;
  hostname: string;
  monitoring_type?: string;
  description?: string;
  overdue_email_alert?: boolean;
  overdue_text_alert?: boolean;
  overdue_dashboard_alert?: boolean;
  offline_time?: number;
  overdue_time?: number;
  check_interval?: number;
  time_zone?: string;
  site?: number;
  custom_fields?: any[];
  winupdatepolicy?: any[];
}

interface EditFormData {
  agent_id: string;
  monitoring_type: string;
  description: string;
  overdue_email_alert: boolean;
  overdue_text_alert: boolean;
  overdue_dashboard_alert: boolean;
  offline_time: number;
  overdue_time: number;
  check_interval: number;
  time_zone: string | null;
  custom_fields: any[];
  winupdatepolicy: any[];
}

const props = defineProps<{
  visible: boolean;
  device: Device | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const updateVisible = (value: boolean) => {
  emit('update:visible', value);
};

const toastService = ToastService.getInstance();

const editForm = ref<EditFormData>({
  agent_id: '',
  monitoring_type: 'workstation',
  description: '',
  overdue_email_alert: false,
  overdue_text_alert: false,
  overdue_dashboard_alert: false,
  offline_time: 4,
  overdue_time: 30,
  check_interval: 120,
  time_zone: null,
  custom_fields: [],
  winupdatepolicy: []
});

const timezoneOptions = [
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  // Add more timezone options as needed
];

watch(() => props.device, (newDevice) => {
  if (newDevice) {
    editForm.value = {
      agent_id: newDevice.agent_id,
      monitoring_type: newDevice.monitoring_type || 'workstation',
      description: newDevice.description || '',
      overdue_email_alert: newDevice.overdue_email_alert || false,
      overdue_text_alert: newDevice.overdue_text_alert || false,
      overdue_dashboard_alert: newDevice.overdue_dashboard_alert || false,
      offline_time: newDevice.offline_time || 4,
      overdue_time: newDevice.overdue_time || 30,
      check_interval: newDevice.check_interval || 120,
      time_zone: newDevice.time_zone || null,
      custom_fields: newDevice.custom_fields || [],
      winupdatepolicy: newDevice.winupdatepolicy || []
    };
  }
}, { immediate: true });

const onClose = () => {
  updateVisible(false);
};

const handleSave = async () => {
  try {
    await restClient.request(
      `${envConfig.GATEWAY_URL}/agents/${editForm.value.agent_id}/`,
      {
        method: 'PUT',
        body: JSON.stringify(editForm.value)
      }
    );
    toastService.showSuccess('Device settings updated successfully');
    emit('saved');
    onClose();
  } catch (error) {
    console.error('Error updating device:', error);
    toastService.showError('Failed to update device settings');
  }
};
</script>

<style scoped>
.p-dialog-custom {
  .p-dialog-header {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-dialog-content {
    background: var(--surface-section);
    color: var(--text-color);
    padding: 1.5rem;
  }

  .p-dialog-footer {
    background: var(--surface-section);
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--surface-border);
  }
}

:deep(.p-dialog-mask) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.p-dialog) {
  margin: 0 auto !important;
}

:deep(.p-dialog-content) {
  overflow-y: auto !important;
  max-height: calc(90vh - 120px) !important;
}

:deep(.p-inputgroup-addon) {
  background: var(--surface-ground);
  border-color: var(--surface-border);
  color: var(--text-color-secondary);
}

:deep(.p-checkbox) {
  width: 1.25rem;
  height: 1.25rem;
}
</style> 