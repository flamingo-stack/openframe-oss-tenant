import { computed } from '@vue/runtime-core';

export interface ScriptTypeOptions {
    script_type: string;
}

export function useScriptType() {
    const formatScriptType = (type: string) => {
        const typeMap: Record<string, string> = {
            builtin: 'BUILT-IN',
            userdefined: 'USER DEFINED'
        };
        return typeMap[type] || type;
    };

    const getScriptTypeSeverity = (type: string) => {
        const severityMap: Record<string, string> = {
            builtin: 'info',
            userdefined: 'success'
        };
        return severityMap[type] || 'info';
    };

    const getScriptTypeClass = computed(() => (type: string) => {
        if (type === 'builtin') {
            return 'p-tag-info';
        }
        if (type === 'userdefined') {
            return 'p-tag-success';
        }
        return '';
    });

    return {
        formatScriptType,
        getScriptTypeSeverity,
        getScriptTypeClass
    };
} 