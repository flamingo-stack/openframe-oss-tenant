import { ref } from 'vue';
import { restClient } from '../apollo/apolloClient';
import { API_URL } from '../config';
import type { ExtendedRMMSettings } from '../types/rmm';

export function useSettings() {
  const settings = ref<ExtendedRMMSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchConfig = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await restClient.request<ExtendedRMMSettings>(`${API_URL}/settings/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      settings.value = response;
    } catch (err) {
      console.error('Error fetching settings:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch settings';
    } finally {
      loading.value = false;
    }
  };

  return {
    settings,
    loading,
    error,
    fetchConfig
  };
} 