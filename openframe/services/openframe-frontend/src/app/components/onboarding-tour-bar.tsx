'use client';

import { CompassIcon, RouteIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Full-width banner rendered in the app layout's `topBar` slot (above sidebar +
 * header) that invites the user into the "Get Started" tour. Same accent-yellow
 * surface as {@link InitialSetupBar}; shown on every page until the user opens
 * the onboarding page. Hidden on `/onboarding` itself; visibility is decided by
 * the caller.
 *
 * Responsive: mobile stacks the icon+text row above a full-width CTA; from `md`
 * up it's a single inline row with an auto-width CTA. The CTA reads "Take the
 * Tour" until the first step is done, then "Continue Onboarding" (`started`).
 * Button matches Figma — `variant="outline" size="small"` (dark card surface,
 * uppercase `text-h5` label) with a leading route glyph.
 */
export function OnboardingTourBar({ onStart, started = false }: { onStart: () => void; started?: boolean }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-system-s)] bg-ods-accent px-[var(--spacing-system-l)] py-[var(--spacing-system-s)] text-ods-text-on-accent md:flex-row md:items-center">
      <div className="flex w-full items-center gap-[var(--spacing-system-s)] md:flex-1">
        <CompassIcon className="size-4 shrink-0 md:size-6" />
        <p className="min-w-0 flex-1 text-h4 md:truncate">Learn the basics with a quick guided tour.</p>
      </div>
      <Button variant="outline" size="small" leftIcon={<RouteIcon />} onClick={onStart} className="w-full md:w-auto">
        {started ? 'Continue Onboarding' : 'Take the Tour'}
      </Button>
    </div>
  );
}
