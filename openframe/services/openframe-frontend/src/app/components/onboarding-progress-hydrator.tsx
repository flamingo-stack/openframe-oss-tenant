'use client';

import { useEffect } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { refreshOnboardingProgress } from '@/graphql/onboarding/onboarding-progress-relay';

/**
 * Fetches onboarding progress into the onboarding store once on mount. Renders
 * nothing. Mounted in the app shell only when the `new-onboarding` flag is on, so
 * the onboarding queries never fire while the feature is off. Non-suspending — the
 * fetch runs in an effect and errors degrade gracefully (see refreshOnboardingProgress).
 */
export function OnboardingProgressHydrator() {
  const environment = useRelayEnvironment();

  useEffect(() => {
    refreshOnboardingProgress(environment);
  }, [environment]);

  return null;
}
