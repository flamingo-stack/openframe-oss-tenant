'use client';

import { useState } from 'react';

export type StepActionKind = 'primary' | 'complete';

/**
 * Coordinates the two action buttons of an onboarding step — the primary action
 * (Save / Add / Go to … / Start …) and "Mark as Complete" — so the spinner always
 * shows on the button the user actually clicked, and the other button is disabled
 * meanwhile. Never both spinning, never the wrong one.
 *
 * Why this is needed: both buttons ultimately call the same `onComplete`, which the
 * parent tracks with a single `completing` flag. Without disambiguation, clicking
 * the primary would light up "Mark as Complete" (and vice-versa). We remember which
 * button initiated the in-flight work (`via`) and route the loading state to it.
 *
 * @param completing   Parent's "this step's completion mutation is in flight" flag.
 * @param primaryBusy  The primary action's OWN request state (e.g. `isSubmitting`),
 *                     for primaries that hit the network before completing. Omit for
 *                     a primary that only navigates.
 */
export function useStepActionState({
  completing = false,
  primaryBusy = false,
}: {
  completing?: boolean;
  primaryBusy?: boolean;
}) {
  const [via, setVia] = useState<StepActionKind | null>(null);

  const completeLoading = completing && via === 'complete';
  const primaryLoading = primaryBusy || (completing && via === 'primary');
  const anyBusy = completing || primaryBusy;

  return {
    /** Call with the button kind at the start of its onClick, before firing the action. */
    begin: setVia,
    complete: {
      loading: completeLoading,
      // Disabled while the primary action is working (so completion can't be double-fired).
      disabled: anyBusy && !completeLoading,
    },
    primary: {
      loading: primaryLoading,
      disabled: anyBusy && !primaryLoading,
    },
  };
}
