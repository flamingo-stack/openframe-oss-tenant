'use client';

import { CompassIcon, RouteIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';

/**
 * Full-width banner rendered in the app layout's `topBar` slot (above sidebar +
 * header) that invites the user into the "Get Started" tour. Same accent-yellow
 * surface as {@link InitialSetupBar}; shown on every page until the user opens
 * the onboarding page. Hidden on `/onboarding` itself; visibility is decided by
 * the caller.
 *
 * Responsive (mirrors {@link InitialSetupBar}, Figma 9622-39382): a single inline
 * row on every breakpoint — icon + text + CTA side by side. On mobile the text
 * wraps and the CTA shares the row (each `flex-1`); from `md` up the text truncates
 * on one line and the CTA shrinks to its content width on the right. The CTA reads
 * "Take the Tour" until the first step is done, then "Continue Onboarding"
 * (`started`). Button matches Figma — `variant="outline" size="small"` (dark card
 * surface, uppercase `text-h5` label) with a leading route glyph.
 *
 * `showAction` (default true) — when false the CTA stays in the DOM but is made
 * `invisible` (non-clickable, non-focusable, still occupies space) so the banner
 * keeps a consistent height on `/onboarding` itself as on every other page.
 */
export function OnboardingTourBar({
  onStart,
  started = false,
  showAction = true,
}: {
  onStart: () => void;
  started?: boolean;
  showAction?: boolean;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-[var(--spacing-system-s)] bg-ods-accent px-[var(--spacing-system-l)] py-[var(--spacing-system-s)] text-ods-text-on-accent">
      <CompassIcon className="size-6 shrink-0" />
      <p className="min-w-0 flex-1 break-words text-h4 md:truncate">Learn the basics with a quick guided tour.</p>
      <Button
        variant="outline"
        size="small"
        leftIcon={<RouteIcon />}
        onClick={onStart}
        aria-hidden={!showAction}
        className={cn('flex-1 md:w-auto md:flex-none', !showAction && 'invisible')}
      >
        {started ? 'Continue Onboarding' : 'Take the Tour'}
      </Button>
    </div>
  );
}
