// Form components
export { default as MultiSelect } from './form/MultiSelect.vue';
export { default as ScriptEditor } from './form/ScriptEditor.vue';
export { default as OFDropdown } from './form/OFDropdown.vue';
export { default as OFNestedObjectEditor } from './form/OFNestedObjectEditor.vue';

// Button components
export { default as OFButton } from './Button.vue';

// Layout components
export { default as ModuleLayout } from './layout/ModuleLayout.vue';

// Dialog components
export { default as OFDialog } from './dialog/OFDialog.vue';
export { default as OFScriptDialog } from './dialog/OFScriptDialog.vue';
export { default as OFConfirmationDialog } from './dialog/OFConfirmationDialog.vue';

// Display components
export { default as OFCodeBlock } from './display/OFCodeBlock.vue';

// Export all from PrimeVue that we're using as-is but not already globally registered
export { default as Dialog } from 'primevue/dialog';
export { default as Dropdown } from 'primevue/dropdown';
export { default as Tag } from 'primevue/tag';
export { default as InputText } from 'primevue/inputtext';
export { default as Column } from 'primevue/column';
export { default as DataTable } from 'primevue/datatable';
export { default as Textarea } from 'primevue/textarea';
// Re-export PrimeVue directives properly
export { default as TooltipDirective } from 'primevue/tooltip';
