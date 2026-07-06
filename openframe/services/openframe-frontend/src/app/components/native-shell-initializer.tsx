'use client';

import { useEffect } from 'react';
import { applyNativeSafeAreas, isNativeShell } from '@/lib/native-shell';
import { initTokenStore } from '@/lib/token-store';

/**
 * Kicks off Keychain -> memory token hydration as early as possible in the
 * native shell so the first API calls can attach a bearer synchronously.
 * Not a render gate: if a request wins the race, the normal 401 -> refresh ->
 * retry path recovers (refresh awaits hydration). No-op on the web.
 */
export function NativeShellInitializer() {
  useEffect(() => {
    if (isNativeShell()) {
      void initTokenStore();
      // Activates the shell-only safe-area CSS in globals.css.
      document.documentElement.dataset.nativeShell = 'true';
      void applyNativeSafeAreas();
    }
  }, []);

  return null;
}
