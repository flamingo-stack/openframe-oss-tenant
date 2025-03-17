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

  private getErrorTitle(message: string, error?: string): string {
    if (error === 'invalid_request') return 'Registration Error';
    if (error === 'invalid_grant') return 'Authentication Error';
    if (error === 'invalid_token') return 'Session Error';
    if (error === 'unauthorized_client') return 'Authorization Error';
    if (error === 'server_error') return 'Server Error';
    if (error === 'temporarily_unavailable') return 'Service Unavailable';
    return 'Error';
  }

  private addClickableToast(options: {
    severity: 'success' | 'info' | 'warn' | 'error';
    summary: string;
    detail: string;
    onClick: () => void;
    duration?: number;
  }) {
    const { severity, summary, detail, onClick, duration = 3000 } = options;

    this.toast.add({
      severity,
      summary,
      detail,
      life: duration,
      contentStyleClass: 'clickable-toast'
    });

    // Add click handler to the most recent toast
    setTimeout(() => {
      const toasts = document.querySelectorAll(`.p-toast-message-${severity}`);
      const latestToast = toasts[toasts.length - 1] as HTMLElement;
      if (latestToast) {
        latestToast.style.cursor = 'pointer';
        latestToast.addEventListener('click', onClick, { once: true });
      }
    }, 0);
  }

  showError(message: string, error?: string, duration = 5000) {
    if (message.includes('http')) {
      const { url, text } = extractUrlFromMessage(message);
      this.addClickableToast({
        severity: 'error',
        summary: this.getErrorTitle(text, error),
        detail: text,
        onClick: () => window.open(url, '_blank'),
        duration
      });
    } else {
      this.toast.add({
        severity: 'error',
        summary: this.getErrorTitle(message, error),
        detail: message,
        life: duration
      });
    }
  }

  showSuccess(message: string, duration = 3000, onClick?: () => void) {
    if (onClick) {
      this.addClickableToast({
        severity: 'success',
        summary: 'Success',
        detail: message,
        onClick,
        duration
      });
    } else {
      this.toast.add({
        severity: 'success',
        summary: 'Success',
        detail: message,
        life: duration
      });
    }
  }

  showWarning(message: string, duration = 5000, onClick?: () => void) {
    if (onClick) {
      this.addClickableToast({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        onClick,
        duration
      });
    } else {
      this.toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: duration
      });
    }
  }

  showInfo(message: string, duration = 3000, onClick?: () => void) {
    if (onClick) {
      this.addClickableToast({
        severity: 'info',
        summary: 'Info',
        detail: message,
        onClick,
        duration
      });
    } else {
      this.toast.add({
        severity: 'info',
        summary: 'Info',
        detail: message,
        life: duration
      });
    }
  }

  clear() {
    this.toast.removeAllGroups();
  }
} 