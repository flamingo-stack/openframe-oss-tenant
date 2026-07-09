'use client';

import { ListCheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';

/**
 * Full-width banner rendered in the app layout's `topBar` slot (above sidebar +
 * header) while the tenant "Initial Setup" is unfinished. Accent-yellow surface
 * with on-accent (dark) text — see ODS `--color-accent-primary` / `on-accent`.
 * Hidden on the page that hosts the setup card (dashboard); visibility is
 * decided by the caller.
 *
 * Responsive (see Figma 9622-39382): a single inline row on every breakpoint —
 * icon + text + CTA side by side. On mobile the text wraps and the CTA shares the
 * row (each `flex-1`); from `md` up the text truncates on one line and the CTA
 * shrinks to its content width on the right. The CTA reads "Start Setup" until the
 * first step is done, then "Continue Setup" (`started`). Button uses
 * `variant="outline" size="small"` — a dark card surface with an uppercase Azeret
 * Mono (`text-h5`) label, matching Figma.
 *
 * `showAction` (default true) — when false the CTA stays in the DOM but is made
 * `invisible` (non-clickable, non-focusable, still occupies space) so the banner
 * keeps a consistent height on the page that already hosts the setup card
 * (the dashboard) as on every other page.
 */
export function InitialSetupBar({
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
      <ListCheckIcon className="size-6 shrink-0" />
      <p className="min-w-0 flex-1 break-words text-h4 md:truncate">
        Complete your Initial Setup to start using OpenFrame.
      </p>
      <Button
        variant="outline"
        size="small"
        onClick={onStart}
        aria-hidden={!showAction}
        className={cn('flex-1 md:w-auto md:flex-none', !showAction && 'invisible')}
      >
        {started ? 'Continue Setup' : 'Start Setup'}
      </Button>
    </div>
  );
}
