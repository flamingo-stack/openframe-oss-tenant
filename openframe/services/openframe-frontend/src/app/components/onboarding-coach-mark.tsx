'use client';

import { ClipboardListIcon, CompassIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  isOnboardingHintKey,
  ONBOARDING_COACH_MARKS,
  SETUP_HINT_PARAM,
  SETUP_RETURN_PARAM,
} from '@/app/(app)/onboarding/onboarding-coach-marks';

/**
 * Floating contextual coach-mark shown on a destination page when the user arrived
 * from an onboarding step (signalled by the `setupHint` query param). Renders nothing
 * on a normal visit. Mounted once, app-wide, in the app shell.
 */
export function OnboardingCoachMark() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hint = searchParams.get(SETUP_HINT_PARAM);
  const content = isOnboardingHintKey(hint) ? ONBOARDING_COACH_MARKS[hint] : undefined;

  if (!content) return null;

  const returnPath = searchParams.get(SETUP_RETURN_PARAM) || '/onboarding';

  // The CTA reflects the surface the user returns to: the per-user "Onboarding"
  // (Get Started, at /onboarding) vs the tenant "Initial Setup" (dashboard card).
  const returnsToOnboarding = returnPath.startsWith('/onboarding');
  const ctaLabel = returnsToOnboarding ? 'Continue Onboarding' : 'Continue Initial Setup';
  const ctaIcon = returnsToOnboarding ? <CompassIcon className="size-5" /> : <ClipboardListIcon className="size-5" />;

  return (
    <div className="fixed bottom-[var(--spacing-system-l)] right-[var(--spacing-system-l)] z-[60] w-[min(360px,calc(100vw-2rem))]">
      <div className="flex flex-col gap-[var(--spacing-system-m)] rounded-md border border-ods-accent bg-ods-open-yellow-secondary p-[var(--spacing-system-m)] shadow-lg">
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <h3 className="text-h3 text-ods-accent">{content.title}</h3>
          <p className="text-h4 text-ods-accent">{content.body}</p>
        </div>
        <Button variant="accent" leftIcon={ctaIcon} onClick={() => router.push(returnPath)} className="w-full">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
