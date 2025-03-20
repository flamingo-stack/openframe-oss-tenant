<template>
    <OFScriptDialog :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"
        :header="isEditMode ? 'Edit Script' : 'Add New Script'" width="90vw" :style="{ maxWidth: '1800px' }"
        :confirmLabel="isEditMode ? 'Save' : 'Add'" confirmIcon="pi pi-check" :loading="submitting"
        @confirm="handleConfirm" @cancel="handleCancel" class="script-dialog"
        :showConfirm="!isViewMode">
        <template #header>
            <div class="flex align-items-center gap-2">
                <span>{{ isViewMode ? 'View Script' : isEditMode ? 'Edit Script' : 'Add New Script' }}</span>
                <Tag :value="formatScriptType(scriptData.script_type)" 
                     :severity="getScriptTypeSeverity(scriptData.script_type)" />
            </div>
        </template>

        <div class="script-dialog-content">
            <!-- Left Column - Form Fields -->
            <div class="script-form-container">
                <!-- Basic Information Group -->
                <div class="dialog-section">
                    <h3 class="section-title">Basic Information</h3>
                    <div class="section-content">
                        <div class="of-form-group w-full">
                            <label for="name" class="of-form-label">Name</label>
                            <InputText id="name" v-model="scriptData.name" required autofocus class="w-full"
                                :class="{ 'p-invalid': submitted && !scriptData.name }" 
                                :disabled="isFieldDisabled" />
                            <small class="p-error" v-if="submitted && !scriptData.name">
                                Name is required.
                            </small>
                        </div>

                        <div class="of-form-group w-full">
                            <label for="description" class="of-form-label">Description</label>
                            <Textarea id="description" v-model="scriptData.description" required :rows="2"
                                class="w-full" :class="{ 'p-invalid': submitted && !scriptData.description }"
                                :disabled="isFieldDisabled" />
                            <small class="p-error" v-if="submitted && !scriptData.description">
                                Description is required.
                            </small>
                        </div>

                        <div class="of-form-group">
                            <label for="category" class="of-form-label">Category</label>
                            <Dropdown id="category" v-model="scriptData.category" :options="categoryOptions"
                                optionLabel="label" optionValue="value" placeholder="Select category" filter
                                :disabled="isFieldDisabled" />
                        </div>

                        <div class="of-form-group">
                            <label class="of-form-label">Script Type</label>
                            <Tag :value="formatScriptType(scriptData.script_type)" 
                                 :severity="getScriptTypeSeverity(scriptData.script_type)" />
                        </div>
                    </div>
                </div>

                <!-- Script Parameters Group -->
                <div class="dialog-section">
                    <h3 class="section-title">Script Parameters</h3>
                    <div class="section-content">
                        <div class="of-form-group">
                            <label for="shell" class="of-form-label">Script Type</label>
                            <Dropdown id="shell" v-model="scriptData.shell" :options="shellOptions" optionLabel="label"
                                optionValue="value" placeholder="Select script type"
                                :class="{ 'p-invalid': submitted && !scriptData.shell }"
                                :disabled="isFieldDisabled" />
                            <small class="p-error" v-if="submitted && !scriptData.shell">
                                Script type is required.
                            </small>
                        </div>

                        <div class="of-form-group">
                            <label for="platforms" class="of-form-label">Supported Platforms</label>
                            <MultiSelect id="platforms" v-model="scriptData.supported_platforms"
                                :options="platformOptions" optionLabel="label" optionValue="value"
                                placeholder="All Platforms" class="w-full" display="chip" :showClear="true"
                                :filter="false" :showToggleAll="false" :selectAll="false" :resetFilterOnHide="true"
                                :autoOptionFocus="false" :panelClass="'surface-0'"
                                :disabled="isFieldDisabled">
                                <template #header>
                                </template>
                            </MultiSelect>
                        </div>

                        <div class="of-form-group">
                            <label for="timeout" class="of-form-label">Timeout (seconds)</label>
                            <InputNumber id="timeout" v-model="scriptData.default_timeout" :min="1" :max="86400"
                                class="w-full" :disabled="isFieldDisabled" />
                        </div>

                        <div class="of-form-group">
                            <label for="args" class="of-form-label">Script Arguments</label>
                            <div class="recipients-list">
                                <div v-for="(arg, index) in scriptData.args" :key="index" class="recipient-item">
                                    <span>{{ arg }}</span>
                                    <OFButton v-if="!isFieldDisabled" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                                        @click="removeArg(index)" />
                                </div>
                                <div v-if="!isFieldDisabled" class="recipient-input">
                                    <InputText v-model="newArg" class="w-full"
                                        placeholder="Enter argument and press Enter" @keyup.enter="addArg" />
                                    <OFButton icon="pi pi-plus" class="p-button-text p-button-sm" @click="addArg" />
                                </div>
                            </div>
                        </div>

                        <div class="of-form-group">
                            <label for="env_vars" class="of-form-label">Environment Variables</label>
                            <div class="recipients-list">
                                <div v-for="(envVar, index) in scriptData.env_vars" :key="index" class="recipient-item">
                                    <span>{{ envVar }}</span>
                                    <OFButton v-if="!isFieldDisabled" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                                        @click="removeEnvVar(index)" />
                                </div>
                                <div v-if="!isFieldDisabled" class="recipient-input">
                                    <InputText v-model="newEnvVar" class="w-full"
                                        placeholder="Enter key=value and press Enter" @keyup.enter="addEnvVar" />
                                    <OFButton icon="pi pi-plus" class="p-button-text p-button-sm" @click="addEnvVar" />
                                </div>
                            </div>
                        </div>

                        <div class="of-form-group checkbox-group">
                            <div class="checkbox-container">
                                <Checkbox id="run_as_user" v-model="scriptData.run_as_user" :binary="true"
                                    :disabled="isFieldDisabled" />
                                <label for="run_as_user" class="checkbox-label">Run As User (Windows only)</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column - Script Editor -->
            <div class="script-editor-container">
                <div class="dialog-section h-full">
                    <h3 class="section-title">Script Content</h3>
                    <div class="editor-wrapper">
                        <ScriptEditor id="content" v-model="scriptData.syntax" class="script-editor"
                            :error="submitted && !scriptData.syntax ? 'Script content is required.' : ''"
                            :readonly="isFieldDisabled" />
                    </div>
                </div>
            </div>
        </div>
    </OFScriptDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from '@vue/runtime-core';
import {
    OFScriptDialog,
    InputText,
    Textarea,
    Dropdown,
    ScriptEditor,
    OFButton
} from "../../../components/ui";
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import { useScriptType } from '../../../composables/useScriptType';

const props = defineProps<{
    modelValue: boolean;
    isEditMode: boolean;
    submitting: boolean;
    initialData?: {
        id?: number;
        name: string;
        description: string;
        shell: string;
        args: string[];
        category: string | null;
        favorite: boolean;
        default_timeout: number;
        syntax: string;
        filename: string | null;
        hidden: boolean;
        supported_platforms: string[];
        run_as_user: boolean;
        env_vars: string[];
        script_type: string;
    };
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'confirm', data: any): void;
    (e: 'cancel'): void;
}>();

const submitted = ref(false);
const scriptData = ref({
    name: '',
    description: '',
    shell: 'powershell',
    args: [] as string[],
    category: null as string | null,
    favorite: false,
    default_timeout: 90,
    syntax: '',
    filename: null,
    hidden: false,
    supported_platforms: [] as string[],
    run_as_user: false,
    env_vars: [] as string[],
    script_type: 'userdefined' as 'userdefined' | 'builtin'
});

const { formatScriptType, getScriptTypeSeverity, getScriptTypeClass } = useScriptType();

const shellOptions = [
    { label: 'PowerShell', value: 'powershell' },
    { label: 'Batch', value: 'batch' },
    { label: 'Shell', value: 'shell' },
    { label: 'Python', value: 'python' }
];

const platformOptions = [
    { label: 'Windows', value: 'windows' },
    { label: 'Linux', value: 'linux' },
    { label: 'macOS', value: 'darwin' }
];

const categoryOptions = [
    { label: 'TRMM (All):3rd Party Software', value: 'TRMM (All):3rd Party Software' },
    { label: 'TRMM (All):Network', value: 'TRMM (All):Network' },
    { label: 'TRMM (Win):3rd Party Software', value: 'TRMM (Win):3rd Party Software' },
    { label: 'TRMM (Win):Active Directory', value: 'TRMM (Win):Active Directory' },
    { label: 'TRMM (Win):Azure', value: 'TRMM (Win):Azure' },
    { label: 'TRMM (Win):Browsers', value: 'TRMM (Win):Browsers' },
    { label: 'TRMM (Win):Collectors', value: 'TRMM (Win):Collectors' },
    { label: 'TRMM (Win):Hardware', value: 'TRMM (Win):Hardware' },
    { label: 'TRMM (Win):Maintenance', value: 'TRMM (Win):Maintenance' },
    { label: 'TRMM (Win):Monitoring', value: 'TRMM (Win):Monitoring' },
    { label: 'TRMM (Win):Network', value: 'TRMM (Win):Network' },
    { label: 'TRMM (Win):Office', value: 'TRMM (Win):Office' },
    { label: 'TRMM (Win):Other', value: 'TRMM (Win):Other' },
    { label: 'TRMM (Win):Power', value: 'TRMM (Win):Power' },
    { label: 'TRMM (Win):Printing', value: 'TRMM (Win):Printing' },
    { label: 'TRMM (Win):Security', value: 'TRMM (Win):Security' },
    { label: 'TRMM (Win):Storage', value: 'TRMM (Win):Storage' },
    { label: 'TRMM (Win):TacticalRMM Related', value: 'TRMM (Win):TacticalRMM Related' },
    { label: 'TRMM (Win):Testing', value: 'TRMM (Win):Testing' },
    { label: 'TRMM (Win):Updates', value: 'TRMM (Win):Updates' },
    { label: 'TRMM (Win):User Management', value: 'TRMM (Win):User Management' },
    { label: 'TRMM (Win):Windows Features', value: 'TRMM (Win):Windows Features' }
];

const newArg = ref('');
const newEnvVar = ref('');

const addArg = () => {
    if (!newArg.value) return;
    scriptData.value.args.push(newArg.value);
    newArg.value = '';
};

const removeArg = (index: number) => {
    scriptData.value.args.splice(index, 1);
};

const addEnvVar = () => {
    if (!newEnvVar.value) return;
    scriptData.value.env_vars.push(newEnvVar.value);
    newEnvVar.value = '';
};

const removeEnvVar = (index: number) => {
    scriptData.value.env_vars.splice(index, 1);
};

watch(() => props.initialData, (newData: typeof props.initialData) => {
    if (newData) {
        console.log('Initial Data:', newData);
        scriptData.value = {
            ...scriptData.value,
            ...newData,
            script_type: newData.script_type || 'userdefined'
        };
        console.log('Updated Script Data:', scriptData.value);
    }
}, { immediate: true });

const handleConfirm = () => {
    submitted.value = true;
    if (validateScript()) {
        emit('confirm', scriptData.value);
    }
};

const handleCancel = () => {
    submitted.value = false;
    emit('cancel');
};

const validateScript = () => {
    if (!scriptData.value.name || !scriptData.value.shell ||
        !scriptData.value.description || !scriptData.value.syntax) {
        return false;
    }
    return true;
};

const scriptTypeDisplay = computed(() => {
    return scriptData.value.script_type === 'userdefined' ? 'User Defined' : 'Built-In';
});

const isViewMode = computed(() => {
    return props.initialData?.script_type === 'builtin';
});

const isFieldDisabled = computed(() => {
    return isViewMode.value || (!props.isEditMode && props.initialData);
});
</script>

<style scoped>
.script-dialog {
    :deep(.p-dialog-content) {
        padding: 0 1.5rem !important;
        overflow: hidden !important;
        height: 85vh !important;
    }
}

.script-dialog-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;
    height: 100%;
    overflow: hidden;
}

.script-form-container {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding-right: 1rem;
    min-width: 0;
    height: 100%;
    padding-bottom: 1rem;
}

.script-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    overflow: hidden;
}

.dialog-section {
    background: var(--surface-card);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--card-shadow);
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
}

.dialog-section.h-full {
    height: 100%;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
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
    min-width: 0;
    width: 100%;
    flex: 1;
    overflow: hidden;
}

.editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: calc(100% - 3.5rem);
    /* Account for title height */
}

.script-editor {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.of-form-group {
    margin-bottom: 1rem;
}

.of-form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

:deep(.p-dialog) {

    .p-multiselect,
    .p-inputnumber,
    .p-dropdown,
    .p-inputtext,
    .p-textarea {
        width: 100%;
    }

    .p-checkbox {
        margin-right: 0.5rem;
    }

    .p-multiselect {
        .p-multiselect-label {
            padding: 0.5rem;
        }

        .p-multiselect-token {
            margin: 0.25rem;
            padding: 0.25rem 0.5rem;
        }
    }
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

:deep(.p-multiselect) {
    width: 100%;
    height: 42px;
    background: var(--surface-section);
    border: none;
}

:deep(.p-multiselect .p-multiselect-label) {
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
}

:deep(.p-multiselect .p-multiselect-trigger) {
    width: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.p-multiselect-panel) {
    .p-multiselect-header {
        display: none !important;
    }

    .p-multiselect-items {
        padding: 0;
    }

    .p-multiselect-item:first-child {
        display: none !important;
    }
}

.checkbox-group {
    margin-bottom: 0;
}

.checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.checkbox-label {
    margin: 0;
    font-weight: normal;
}

:deep(.script-editor) {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
}

:deep(.script-editor > div) {
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
}

/* Update tag styling to match table exactly */
:deep(.p-tag) {
    padding: 0.35rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;
    min-width: 75px;
    justify-content: center;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    &.p-tag-success {
        background: var(--green-50);
        color: var(--green-900);
        border: 1px solid var(--green-200);
    }

    &.p-tag-info {
        background: var(--blue-50);
        color: var(--blue-900);
        border: 1px solid var(--blue-200);
    }
}

/* Remove any custom tag styling that might interfere */
:deep(.p-tag.p-component) {
    border-radius: 2rem;
}
</style>