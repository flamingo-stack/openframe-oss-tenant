'use client';

import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Alert } from '@flamingo-stack/openframe-frontend-core/components/ui';

interface EmailVerificationBannerProps {
  onResend: () => void;
}

export function EmailVerificationBanner({ onResend }: EmailVerificationBannerProps) {
  return (
    <Alert variant="warning" className="flex items-start gap-[var(--spacing-system-m)] p-[var(--spacing-system-s)]">
      <span className="shrink-0">
        <AlertTriangleIcon size={24} />
      </span>
      <div className="flex flex-1 flex-col gap-[var(--spacing-system-s)] sm:flex-row sm:items-center sm:gap-[var(--spacing-system-m)]">
        <p className="flex-1 text-h4 font-bold">Verify your email to keep access to system.</p>
        <button
          type="button"
          onClick={onResend}
          className="shrink-0 self-start whitespace-nowrap text-h4 font-medium underline transition-opacity hover:opacity-80 sm:self-auto"
        >
          Resend Verification Mail
        </button>
      </div>
    </Alert>
  );
}
