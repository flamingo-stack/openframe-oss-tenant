import { ref } from 'vue';
import { restClient } from '../apollo/apolloClient';
import { ConfigService } from '../config/config.service';
import { useToastStore } from '../stores/toast';

const configService = ConfigService.getInstance();
const config = configService.getConfig();

export interface SettingsSaveOptions {
  apiUrl: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  httpMethod?: 'put' | 'patch';
}

export function useSettingsSave(options: SettingsSaveOptions) {
  const toastStore = useToastStore();
  const savingProperties = ref(new Set<string>());
  const changedValues = ref<Record<string, any>>({});
  const hasChanges = ref(false);

  const updateChangedValue = (path: string, value: any) => {
    if (value === null || value === undefined) {
      delete changedValues.value[path];
    } else {
      changedValues.value[path] = value;
    }
    hasChanges.value = Object.keys(changedValues.value).length > 0;
  };

  const clearChangedValues = () => {
    changedValues.value = {};
    hasChanges.value = false;
  };

  const isSaving = (path: string): boolean => {
    return savingProperties.value.has(path);
  };

  const saveConfigProperty = async (category: string, subKey: string | null, value: any) => {
    const path = subKey ? `${category}.${subKey}` : category;
    savingProperties.value.add(path);

    try {
      // Create a properly nested object structure
      const nestedData: Record<string, any> = {};
      
      // Build the nested structure for this specific change
      const parts = path.split('.');
      let current = nestedData;
      
      // Build the nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      
      // Set the value at the deepest level
      current[parts[parts.length - 1]] = value;

      // Make the request with the properly nested data structure
      const method = options.httpMethod || 'put';
      console.log('📤 [MDM] Making request to:', options.apiUrl);
      console.log('📦 [MDM] Request data:', nestedData);
      await restClient[method](options.apiUrl, nestedData);
      console.log('✅ [MDM] Request completed successfully');

      // Clear the changed value after successful save
      updateChangedValue(path, null);
      
      toastStore.showSuccess('Setting updated successfully');
      
      if (options.onSuccess) {
        options.onSuccess();
      }
    } catch (err: any) {
      console.error('❌ [MDM] Error saving config:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      
      if (options.onError) {
        options.onError(err);
      } else {
        const message = err.response?.data?.message || err.message || 'Failed to update setting';
        toastStore.showError(message);
      }
      
      throw err;
    } finally {
      savingProperties.value.delete(path);
    }
  };

  return {
    saveConfigProperty,
    updateChangedValue,
    clearChangedValues,
    isSaving,
    changedValues,
    hasChanges
  };
} 