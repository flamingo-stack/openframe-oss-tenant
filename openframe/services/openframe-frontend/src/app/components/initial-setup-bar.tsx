'use client';

import { ListCheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Full-width banner rendered in the app layout's `topBar` slot (above sidebar +
 * header) while the tenant "Initial Setup" is unfinished. Accent-yellow surface
 * with on-accent (dark) text — see ODS `--color-accent-primary` / `on-accent`.
 * Hidden on the page that hosts the setup card (dashboard); visibility is
 * decided by the caller.
 *
 * Responsive (see Figma 9418-44006): mobile stacks the icon+text row above a
 * full-width CTA; from `md` up it's a single inline row with an auto-width CTA.
 * The CTA reads "Start Setup" until the first step is done, then "Continue
 * Setup" (`started`). Button uses `variant="outline" size="small"` — a dark
 * card surface with an uppercase Azeret Mono (`text-h5`) label, matching Figma.
 */
export function InitialSetupBar({ onStart, started = false }: { onStart: () => void; started?: boolean }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-[var(--spacing-system-s)] bg-ods-accent px-[var(--spacing-system-l)] py-[var(--spacing-system-s)] text-ods-text-on-accent md:flex-row md:items-center">
      <div className="flex w-full items-center gap-[var(--spacing-system-s)] md:flex-1">
        <ListCheckIcon className="size-4 shrink-0 md:size-6" />
        <p className="min-w-0 flex-1 text-h4 md:truncate">Complete your Initial Setup to start using OpenFrame.</p>
      </div>
      <Button variant="outline" size="small" onClick={onStart} className="w-full md:w-auto">
        {started ? 'Continue Setup' : 'Start Setup'}
      </Button>
    </div>
  );
}
