'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { getDefaultRedirectPath } from '../lib/app-mode';
import { AppShellSkeleton } from './components/app-shell-skeleton';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated !== null) {
      router.replace(getDefaultRedirectPath(isAuthenticated));
    }
  }, [router, isAuthenticated]);

  return <AppShellSkeleton />;
}
