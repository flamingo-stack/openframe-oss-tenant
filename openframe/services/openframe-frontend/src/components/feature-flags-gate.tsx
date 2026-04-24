'use client';

import { useEffect } from 'react';
import { useAuthSession } from '@/app/(auth)/auth/hooks/use-auth-session';
import { AppShellSkeleton } from '@/app/components/app-shell-skeleton';
import { useFeatureFlagsQuery } from '@/app/hooks/use-feature-flags-query';
import { isSaasSharedMode } from '@/lib/app-mode';
import { useFeatureFlagsStore } from '@/stores/feature-flags-store';

interface FeatureFlagsGateProps {
  children: React.ReactNode;
}

export function FeatureFlagsGate({ children }: FeatureFlagsGateProps) {
  const saasShared = isSaasSharedMode();
  const { isReady, isAuthenticated } = useAuthSession();
  const isLoaded = useFeatureFlagsStore(s => s.isLoaded);
  const setLoaded = useFeatureFlagsStore(s => s.setLoaded);

  useFeatureFlagsQuery({ enabled: !saasShared && isReady && isAuthenticated });

  useEffect(() => {
    if (saasShared && !isLoaded) {
      setLoaded();
      return;
    }
    if (isReady && !isAuthenticated && !isLoaded) {
      setLoaded();
    }
  }, [saasShared, isReady, isAuthenticated, isLoaded, setLoaded]);

  if (saasShared) {
    return <>{children}</>;
  }

  if (!isReady || (isAuthenticated && !isLoaded)) {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
