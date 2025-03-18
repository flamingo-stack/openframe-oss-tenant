import { defineStore } from 'pinia';
import type { ExtendedRMMSettings } from '@/types/rmm';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null as ExtendedRMMSettings | null,
    loading: false,
    error: null as string | null
  }),
  actions: {
    setSettings(settings: ExtendedRMMSettings | null) {
      this.settings = settings;
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    setError(error: string | null) {
      this.error = error;
    }
  }
}); 