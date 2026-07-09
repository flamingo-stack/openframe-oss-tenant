'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';
import { commitMutation, useRelayEnvironment } from 'react-relay';
import type { PayloadError } from 'relay-runtime';
import type { completeTenantOnboardingMutation as CompleteTenantType } from '@/__generated__/completeTenantOnboardingMutation.graphql';
import type { completeTenantOnboardingStepMutation as CompleteTenantStepType } from '@/__generated__/completeTenantOnboardingStepMutation.graphql';
import type { completeUserOnboardingMutation as CompleteUserType } from '@/__generated__/completeUserOnboardingMutation.graphql';
import type { completeUserOnboardingStepMutation as CompleteUserStepType } from '@/__generated__/completeUserOnboardingStepMutation.graphql';
import type { resetUserOnboardingMutation as ResetUserType } from '@/__generated__/resetUserOnboardingMutation.graphql';
import type { skipUserOnboardingMutation as SkipUserType } from '@/__generated__/skipUserOnboardingMutation.graphql';
import type { TenantOnboardingStep, UserOnboardingStep } from '@/generated/schema-enums';
import {
  type TenantOnboardingProgress,
  type UserOnboardingProgress,
  useOnboardingStore,
} from '@/stores/onboarding-store';
import { completeTenantOnboardingMutation } from './complete-tenant-onboarding-mutation';
import { completeTenantOnboardingStepMutation } from './complete-tenant-onboarding-step-mutation';
import { completeUserOnboardingMutation } from './complete-user-onboarding-mutation';
import { completeUserOnboardingStepMutation } from './complete-user-onboarding-step-mutation';
import { resetUserOnboardingMutation } from './reset-user-onboarding-mutation';
import { skipUserOnboardingMutation } from './skip-user-onboarding-mutation';

type TenantPayload = { completedSteps: readonly string[]; completed: boolean; completedAt: string | null };
type UserPayload = TenantPayload & { skipped: boolean; skippedAt: string | null };

function toTenant(payload: TenantPayload): TenantOnboardingProgress {
  return {
    completedSteps: [...payload.completedSteps] as TenantOnboardingStep[],
    completed: payload.completed,
    completedAt: payload.completedAt ?? null,
  };
}

function toUser(payload: UserPayload): UserOnboardingProgress {
  return {
    completedSteps: [...payload.completedSteps] as UserOnboardingStep[],
    completed: payload.completed,
    completedAt: payload.completedAt ?? null,
    skipped: payload.skipped,
    skippedAt: payload.skippedAt ?? null,
  };
}

/**
 * All onboarding mutations, each committing to the backend, mirroring the returned
 * progress into the onboarding store (so every onboarding surface refreshes in one
 * round-trip), and providing toast feedback.
 *
 * Uses `commitMutation` (not the `useMutation` hook) on purpose: several callers fire
 * a completion and immediately navigate away (e.g. "Save Customer" → /customers,
 * "Go to Devices" → /devices). `useMutation` disposes in-flight requests when its host
 * component unmounts, which would cancel the completion; `commitMutation` is decoupled
 * from the React lifecycle, and both the store and the toaster it writes to live at the
 * root layout, so the completion lands even after the page has changed.
 */
export function useOnboardingMutations() {
  const { toast } = useToast();
  const environment = useRelayEnvironment();
  const setTenant = useOnboardingStore(state => state.setTenant);
  const setUser = useOnboardingStore(state => state.setUser);
  const [pending, setPending] = useState(0);

  const begin = useCallback(() => setPending(count => count + 1), []);
  const finish = useCallback(() => setPending(count => Math.max(0, count - 1)), []);

  const onError = useCallback(
    (fallback: string) => (error: Error | PayloadError) => {
      finish();
      toast({ title: 'Error', description: error.message || fallback, variant: 'destructive' });
    },
    [finish, toast],
  );

  // Per-step completion is intentionally SILENT — no success toast. The badge/UI
  // flipping to "Complete" is feedback enough; a toast per step is noise. Toasts are
  // reserved for the whole-onboarding milestones (completeTenant/completeUser) and
  // skip/reset. Errors still toast.
  const completeTenantStep = useCallback(
    (step: TenantOnboardingStep, onSettled?: () => void) => {
      begin();
      commitMutation<CompleteTenantStepType>(environment, {
        mutation: completeTenantOnboardingStepMutation,
        variables: { step },
        onCompleted: res => {
          finish();
          setTenant(toTenant(res.completeTenantOnboardingStep));
          onSettled?.();
        },
        onError: err => {
          onError('Failed to update setup')(err);
          onSettled?.();
        },
      });
    },
    [environment, begin, finish, setTenant, onError],
  );

  // Fire-and-forget step completion for "open"/navigate actions (Go to …, View …,
  // Start …): the completion is a background side-effect of opening a page, not
  // something the user waits on. Unlike completeTenantStep/completeUserStep it does
  // NOT touch the pending counter (`isMutating`) and takes no `onSettled`, so NO
  // button anywhere shows a spinner — the store just updates when it lands. Errors
  // still toast.
  const completeTenantStepInBackground = useCallback(
    (step: TenantOnboardingStep) => {
      commitMutation<CompleteTenantStepType>(environment, {
        mutation: completeTenantOnboardingStepMutation,
        variables: { step },
        onCompleted: res => setTenant(toTenant(res.completeTenantOnboardingStep)),
        onError: err =>
          toast({ title: 'Error', description: err.message || 'Failed to update setup', variant: 'destructive' }),
      });
    },
    [environment, setTenant, toast],
  );

  const completeUserStepInBackground = useCallback(
    (step: UserOnboardingStep) => {
      commitMutation<CompleteUserStepType>(environment, {
        mutation: completeUserOnboardingStepMutation,
        variables: { step },
        onCompleted: res => setUser(toUser(res.completeUserOnboardingStep)),
        onError: err =>
          toast({ title: 'Error', description: err.message || 'Failed to update onboarding', variant: 'destructive' }),
      });
    },
    [environment, setUser, toast],
  );

  const completeTenant = useCallback(
    (successMessage = 'Initial Setup complete') => {
      begin();
      commitMutation<CompleteTenantType>(environment, {
        mutation: completeTenantOnboardingMutation,
        variables: {},
        onCompleted: res => {
          finish();
          setTenant(toTenant(res.completeTenantOnboarding));
          toast({ title: successMessage, variant: 'success' });
        },
        onError: onError('Failed to complete setup'),
      });
    },
    [environment, begin, finish, setTenant, toast, onError],
  );

  // Silent per-step completion — see completeTenantStep. Only errors toast.
  const completeUserStep = useCallback(
    (step: UserOnboardingStep, onSettled?: () => void) => {
      begin();
      commitMutation<CompleteUserStepType>(environment, {
        mutation: completeUserOnboardingStepMutation,
        variables: { step },
        onCompleted: res => {
          finish();
          setUser(toUser(res.completeUserOnboardingStep));
          onSettled?.();
        },
        onError: err => {
          onError('Failed to update onboarding')(err);
          onSettled?.();
        },
      });
    },
    [environment, begin, finish, setUser, onError],
  );

  const completeUser = useCallback(
    (onDone?: () => void) => {
      begin();
      commitMutation<CompleteUserType>(environment, {
        mutation: completeUserOnboardingMutation,
        variables: {},
        onCompleted: res => {
          finish();
          setUser(toUser(res.completeUserOnboarding));
          toast({ title: 'Onboarding complete', variant: 'success' });
          onDone?.();
        },
        onError: onError('Failed to finish onboarding'),
      });
    },
    [environment, begin, finish, setUser, toast, onError],
  );

  const skipUser = useCallback(
    (onDone?: () => void) => {
      begin();
      commitMutation<SkipUserType>(environment, {
        mutation: skipUserOnboardingMutation,
        variables: {},
        onCompleted: res => {
          finish();
          setUser(toUser(res.skipUserOnboarding));
          onDone?.();
        },
        onError: onError('Failed to skip onboarding'),
      });
    },
    [environment, begin, finish, setUser, onError],
  );

  const resetUser = useCallback(
    (onDone?: () => void) => {
      begin();
      commitMutation<ResetUserType>(environment, {
        mutation: resetUserOnboardingMutation,
        variables: {},
        onCompleted: res => {
          finish();
          setUser(toUser(res.resetUserOnboarding));
          toast({
            title: 'Onboarding reset',
            description: 'Your Get Started tour is available again.',
            variant: 'success',
          });
          onDone?.();
        },
        onError: onError('Failed to reset onboarding'),
      });
    },
    [environment, begin, finish, setUser, toast, onError],
  );

  return {
    completeTenantStep,
    completeTenantStepInBackground,
    completeTenant,
    completeUserStep,
    completeUserStepInBackground,
    completeUser,
    skipUser,
    resetUser,
    isMutating: pending > 0,
  };
}
