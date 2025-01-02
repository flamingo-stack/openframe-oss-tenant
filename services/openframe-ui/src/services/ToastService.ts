import { useToast } from 'primevue/usetoast';
import type { ToastServiceMethods } from 'primevue/toastservice';

const extractUrlFromMessage = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.match(urlRegex);
  if (match) {
    return { url: match[0], text: message };
  }
  return { text: message };
};

export class ToastService {
  private static instance: ToastService;
  private toast: ToastServiceMethods;

  private constructor() {
    this.toast = useToast();
  }

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  showError(message: string, duration = 5000) {
    if (message.includes('http')) {
      const { url, text } = extractUrlFromMessage(message);
      
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: `${text}`,
        life: duration,
        contentStyleClass: 'error-toast-content clickable-toast'
      });

      // Add click handler to all error toasts
      const handleToastClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.error-toast-content.clickable-toast')) {
          window.open(url, '_blank');
        }
      };

      document.addEventListener('click', handleToastClick);

      // Clean up the event listener when the toast is removed
      setTimeout(() => {
        document.removeEventListener('click', handleToastClick);
      }, duration);
    } else {
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: message,
        life: duration
      });
    }
  }

  showSuccess(message: string, duration = 3000) {
    this.toast.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: duration
    });
  }

  showWarning(message: string, duration = 5000) {
    this.toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: message,
      life: duration
    });
  }

  showInfo(message: string, duration = 3000) {
    this.toast.add({
      severity: 'info',
      summary: 'Info',
      detail: message,
      life: duration
    });
  }

  clear() {
    this.toast.removeAllGroups();
  }
} 