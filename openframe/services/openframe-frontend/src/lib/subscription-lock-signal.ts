'use client';

import { create } from 'zustand';

const TRIAL_EXPIRED_CLASSIFICATION = 'SUBSCRIPTION_TRIAL_EXPIRED';

interface GraphqlErrorLike {
  extensions?: {
    classification?: string;
  } | null;
}

interface SubscriptionLockSignalState {
  trialExpiredFromErrors: boolean;
  markTrialExpired: () => void;
  reset: () => void;
}

export const useSubscriptionLockSignal = create<SubscriptionLockSignalState>(set => ({
  trialExpiredFromErrors: false,
  markTrialExpired: () => set({ trialExpiredFromErrors: true }),
  reset: () => set({ trialExpiredFromErrors: false }),
}));

export function hasTrialExpiredClassification(errors: GraphqlErrorLike[] | undefined | null): boolean {
  if (!errors?.length) return false;
  return errors.some(err => err?.extensions?.classification === TRIAL_EXPIRED_CLASSIFICATION);
}

export function detectTrialExpiredFromGraphqlErrors(errors: GraphqlErrorLike[] | undefined | null): void {
  if (hasTrialExpiredClassification(errors)) {
    useSubscriptionLockSignal.getState().markTrialExpired();
  }
}
