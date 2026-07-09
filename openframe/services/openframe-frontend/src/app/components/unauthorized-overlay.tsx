'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { authSessionQueryKey } from '@/app/(auth)/auth/hooks/use-auth-session';
import { nativeLogin } from '@/lib/native-login';
import { isNativeShell } from '@/lib/native-shell';
import { runtimeEnv } from '@/lib/runtime-config';

interface UnauthorizedOverlayProps {
  onRetry?: () => void;
}

export function UnauthorizedOverlay({ onRetry }: UnauthorizedOverlayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const loginUrl = runtimeEnv.authLoginUrl();

  // saas-tenant bundles have no /auth pages, so in the native shell this
  // overlay is the sign-in entry point: system-browser OAuth against the
  // tenant baked into the build.
  const handleNativeLogin = async () => {
    const tenantId = runtimeEnv.mobileTenantId();
    if (!tenantId) {
      toast({
        title: 'Sign-in unavailable',
        description: 'NEXT_PUBLIC_MOBILE_TENANT_ID is not configured in this build.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningIn(true);
    try {
      await nativeLogin({ tenantId });
      await queryClient.invalidateQueries({ queryKey: authSessionQueryKey });
      toast({ title: 'Welcome!', description: 'Successfully signed in', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      if (message !== 'USER_CANCELED') {
        toast({ title: 'Sign-in failed', description: message, variant: 'destructive' });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogin = () => {
    if (isNativeShell()) {
      void handleNativeLogin();
      return;
    }
    if (loginUrl) {
      // Land on the Login tab directly — the auth host's root defaults to Sign Up
      window.location.href = `${loginUrl.replace(/\/+$/, '')}/auth/login/`;
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
          <Button onClick={handleLogin} disabled={isSigningIn}>
            {isSigningIn ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </div>
    </div>
  );
}
