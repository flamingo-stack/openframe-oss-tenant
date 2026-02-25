'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { runtimeEnv } from '../../lib/runtime-config';

interface UnauthorizedOverlayProps {
  onRetry?: () => void;
}

export function UnauthorizedOverlay({ onRetry }: UnauthorizedOverlayProps) {
  const loginUrl = runtimeEnv.authLoginUrl();

  const handleLogin = () => {
    if (loginUrl) {
      window.location.href = loginUrl;
    } else {
      // Fallback: reload or no-op
      if (onRetry) onRetry();
    }
  };

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold text-ods-text-primary">Sign in required</h1>
        <p className="text-ods-text-secondary">You need to sign in to access this page.</p>
        <div className="flex justify-center">
          <Button onClick={handleLogin}>Sign in</Button>
        </div>
      </div>
    </div>
  );
}
