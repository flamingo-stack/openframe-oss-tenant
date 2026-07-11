import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { TenantOnboardingStep, UserOnboardingStep } from '@/generated/schema-enums';

/**
 * Onboarding progress, mirrored from the backend (`tenantOnboardingProgress` /
 * `userOnboardingProgress`). Fed once by `OnboardingProgressHydrator` and kept
 * fresh by the onboarding mutation hook (each mutation returns the full progress
 * object). Every onboarding surface — the app-layout top bar + sidebar badge, the
 * dashboard Initial Setup card, and the /onboarding Get Started page — reads from
 * this store so a single "Mark as Complete" updates all of them at once.
 *
 * Non-suspending on purpose: the chrome is decorative and must never block the app
 * shell. Surfaces treat `isLoaded === false` as "still loading".
 */
export interface TenantOnboardingProgress {
  completedSteps: TenantOnboardingStep[];
  completed: boolean;
  completedAt: string | null;
}

export interface UserOnboardingProgress {
  completedSteps: UserOnboardingStep[];
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  skippedAt: string | null;
}

export interface OnboardingState {
  tenant: TenantOnboardingProgress | null;
  user: UserOnboardingProgress | null;
  isLoaded: boolean;
  setTenant: (progress: TenantOnboardingProgress) => void;
  setUser: (progress: UserOnboardingProgress) => void;
  setLoaded: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    immer(set => ({
      tenant: null,
      user: null,
      isLoaded: false,

      setTenant: progress =>
        set(state => {
          state.tenant = progress;
          state.isLoaded = true;
        }),

      setUser: progress =>
        set(state => {
          state.user = progress;
          state.isLoaded = true;
        }),

      setLoaded: () =>
        set(state => {
          state.isLoaded = true;
        }),

      reset: () =>
        set(state => {
          state.tenant = null;
          state.user = null;
          state.isLoaded = false;
        }),
    })),
    { name: 'onboarding-store' },
  ),
);
