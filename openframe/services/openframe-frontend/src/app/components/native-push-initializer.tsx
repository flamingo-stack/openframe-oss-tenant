'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { initNativePush } from '@/lib/native-push';
import { isNativeShell } from '@/lib/native-shell';

/**
 * Mounted once the user is authenticated (app-layout): asks for notification
 * permission, registers with APNs, and deep-links notification taps through
 * the client router. Renders nothing; no-ops outside the native shell.
 */
export function NativePushInitializer() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeShell()) return;
    void initNativePush(route => router.push(route));
  }, [router]);

  return null;
}
