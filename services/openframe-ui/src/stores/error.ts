import { defineStore } from 'pinia';

export const useErrorStore = defineStore('error', {
  state: () => ({
    error: null as string | null
  }),
  actions: {
    setError(error: string | null) {
      this.error = error;
    },
    clearError() {
      this.error = null;
    }
  }
}); 