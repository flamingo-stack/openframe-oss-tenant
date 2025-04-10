import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';

export const useToastStore = defineStore('toast', {
  state: () => ({
    toast: useToast(),
  }),
  actions: {
    showSuccess(message: string) {
      this.toast.add({
        severity: 'success',
        summary: 'Success',
        detail: message,
        life: 3000,
      });
    },
    showError(message: string) {
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: message,
        life: 3000,
      });
    },
    showWarning(message: string) {
      this.toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 3000,
      });
    },
    showInfo(message: string) {
      this.toast.add({
        severity: 'info',
        summary: 'Info',
        detail: message,
        life: 3000,
      });
    },
  },
}); 