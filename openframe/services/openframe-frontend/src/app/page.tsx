'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDefaultRedirectPath } from '../lib/app-mode';
import { useAuthStore } from './auth/stores/auth-store';
import { AppShellSkeleton } from './components/app-shell-skeleton';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated !== null) {
      const redirectPath = getDefaultRedirectPath(isAuthenticated);
      router.push(redirectPath);
    }
  }, [router, isAuthenticated]);

  return <AppShellSkeleton />;
}
