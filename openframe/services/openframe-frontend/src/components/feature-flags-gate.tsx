'use client';

import { useEffect } from 'react';
import { useAuthSession } from '@/app/auth/hooks/use-auth-session';
import { AppShellSkeleton } from '@/app/components/app-shell-skeleton';
import { useFeatureFlagsQuery } from '@/app/hooks/use-feature-flags-query';
import { useFeatureFlagsStore } from '@/stores/feature-flags-store';

interface FeatureFlagsGateProps {
  children: React.ReactNode;
}

export function FeatureFlagsGate({ children }: FeatureFlagsGateProps) {
  const { isReady, isAuthenticated } = useAuthSession();
  const isLoaded = useFeatureFlagsStore(s => s.isLoaded);
  const setLoaded = useFeatureFlagsStore(s => s.setLoaded);

  useFeatureFlagsQuery({ enabled: isReady && isAuthenticated });

  useEffect(() => {
    if (isReady && !isAuthenticated && !isLoaded) {
      setLoaded();
    }
  }, [isReady, isAuthenticated, isLoaded, setLoaded]);

  if (!isReady || (isAuthenticated && !isLoaded)) {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
