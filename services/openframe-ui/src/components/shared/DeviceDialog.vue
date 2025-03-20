<template>
  <Dialog 
    :visible="visible"
    @update:visible="(val) => emit('update:visible', val)"
    :header="isEditMode ? 'Edit Device' : 'Add New Device'"
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
          <label for="hostname">Hostname</label>
          <InputText 
            id="hostname" 
            v-model="device.hostname" 
            required 
            autofocus 
            placeholder="Enter device hostname"
            :class="{ 'p-invalid': submitted && !device.hostname }"
          />
          <small class="p-error" v-if="submitted && !device.hostname">
            Hostname is required.
          </small>
        </div>
      </div>

      <div class="col-12">
        <div class="field">
          <label for="platform">Platform</label>
          <Dropdown
            id="platform"
            v-model="device.platform"
            :options="platforms"
            optionLabel="name"
            optionValue="value"
            placeholder="Select target platform"
            class="w-full"
            :panelClass="'surface-0'"
            :pt="{
              panel: { class: 'shadow-2 border-none' },
              item: { class: 'p-3 text-base hover:surface-hover' }
            }"
            :class="{ 'p-invalid': submitted && !device.platform }"
          />
          <small class="p-error" v-if="submitted && !device.platform">
            Platform is required.
          </small>
        </div>
      </div>

      <div class="col-12">
        <div class="field">
          <label for="os_version">OS Version</label>
          <InputText 
            id="os_version" 
            v-model="device.os_version" 
            required 
            placeholder="Enter OS version"
            :class="{ 'p-invalid': submitted && !device.os_version }"
          />
          <small class="p-error" v-if="submitted && !device.os_version">
            OS Version is required.
          </small>
        </div>
      </div>

      <div class="col-12">
        <div class="field">
          <label for="ip_address">IP Address</label>
          <InputText 
            id="ip_address" 
            v-model="device.ip_address" 
            required 
            placeholder="Enter IP address"
            :class="{ 'p-invalid': submitted && !device.ip_address }"
          />
          <small class="p-error" v-if="submitted && !device.ip_address">
            IP Address is required.
          </small>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <OFButton 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="onCancel"
        />
        <OFButton 
          :label="isEditMode ? 'Update' : 'Add'" 
          icon="pi pi-check" 
          class="p-button-primary" 
          @click="onSave" 
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import { OFButton } from '../../components/ui';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';

interface DeviceForm {
  hostname: string;
  platform: string | null;
  os_version: string;
  ip_address: string;
}

const props = defineProps<{
  visible: boolean;
  isEditMode: boolean;
  loading: boolean;
  initialDevice?: DeviceForm;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'save', device: DeviceForm): void;
  (e: 'cancel'): void;
}>();

const device = ref<DeviceForm>({
  hostname: '',
  platform: null,
  os_version: '',
  ip_address: ''
});

const submitted = ref(false);

const platforms = [
  { name: 'Windows', value: 'windows' },
  { name: 'macOS', value: 'darwin' },
  { name: 'Linux', value: 'linux' }
];

watch(() => props.initialDevice, (newValue) => {
  if (newValue) {
    device.value = { ...newValue };
  }
}, { immediate: true });

watch(() => props.visible, (newValue) => {
  if (!newValue) {
    resetForm();
  }
});

const onSave = () => {
  submitted.value = true;

  if (!device.value.hostname || !device.value.platform || 
      !device.value.os_version || !device.value.ip_address) {
    return;
  }

  emit('save', device.value);
};

const onCancel = () => {
  emit('update:visible', false);
  emit('cancel');
  resetForm();
};

const resetForm = () => {
  device.value = {
    hostname: '',
    platform: null,
    os_version: '',
    ip_address: ''
  };
  submitted.value = false;
};
</script>

<style>
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

  .field {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-color);
    }
  }

  .p-inputtext,
  .p-dropdown {
    width: 100%;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    transition: all 0.2s;

    &:hover {
      border-color: var(--primary-color);
    }

    &:focus,
    &.p-focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }

    &.p-invalid {
      border-color: var(--red-500);
    }
  }
}
</style>  