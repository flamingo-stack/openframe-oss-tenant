'use client';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { OnboardingContent } from './components/onboarding-content';
import { OnboardingSkeleton } from './components/onboarding-skeleton';

export default function OnboardingPage() {
  // Gated behind the `new-onboarding` flag — when off, the legacy dashboard
  // onboarding section is shown instead and this route does not exist.
  if (!featureFlags.newOnboarding.enabled()) {
    notFound();
  }

  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}
