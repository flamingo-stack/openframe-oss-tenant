'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { routes } from '@/lib/routes';
import { useFeatureFlagsStore } from '@/stores/feature-flags-store';

/**
 * Gates every `/scripts-v2/*` route behind the `scripts-v2` feature flag.
 * Feature flags are guaranteed loaded before app children render (see
 * `FeatureFlagsGate`), so this reads the resolved value with no flash. When the
 * flag is off, direct navigation here redirects to the stable `/scripts` page.
 */
export default function ScriptsV2Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Subscribe to the resolved flag so the gate re-evaluates when the store loads
  // or the value changes. When the server doesn't return the flag, fall back to
  // the env-var default (mirrors `featureFlags.scriptsV2.enabled()`).
  const serverValue = useFeatureFlagsStore(s => (s.isLoaded ? s.flags['scripts-v2'] : undefined));
  const enabled = serverValue ?? featureFlags.scriptsV2.enabled();

  useEffect(() => {
    if (!enabled) {
      router.replace(routes.scripts.list());
    }
  }, [enabled, router]);

  if (!enabled) {
    return null;
  }

  return <>{children}</>;
}
