import { fetchQuery, graphql } from 'react-relay';
import type { IEnvironment } from 'relay-runtime';
import type { onboardingProgressRelayQuery as OnboardingProgressRelayQueryType } from '@/__generated__/onboardingProgressRelayQuery.graphql';
import type { TenantOnboardingStep, UserOnboardingStep } from '@/generated/schema-enums';
import { useOnboardingStore } from '@/stores/onboarding-store';

export const onboardingProgressRelayQuery = graphql`
  query onboardingProgressRelayQuery {
    tenantOnboardingProgress {
      completedSteps
      completed
      completedAt
    }
    userOnboardingProgress {
      completedSteps
      completed
      completedAt
      skipped
      skippedAt
    }
  }
`;

type QueryResponse = OnboardingProgressRelayQueryType['response'];

/** Write a query/mutation response's progress objects into the onboarding store. */
export function syncOnboardingStore(data: {
  tenantOnboardingProgress: QueryResponse['tenantOnboardingProgress'];
  userOnboardingProgress: QueryResponse['userOnboardingProgress'];
}): void {
  const { setTenant, setUser } = useOnboardingStore.getState();
  setTenant({
    completedSteps: [...data.tenantOnboardingProgress.completedSteps] as TenantOnboardingStep[],
    completed: data.tenantOnboardingProgress.completed,
    completedAt: data.tenantOnboardingProgress.completedAt ?? null,
  });
  setUser({
    completedSteps: [...data.userOnboardingProgress.completedSteps] as UserOnboardingStep[],
    completed: data.userOnboardingProgress.completed,
    completedAt: data.userOnboardingProgress.completedAt ?? null,
    skipped: data.userOnboardingProgress.skipped,
    skippedAt: data.userOnboardingProgress.skippedAt ?? null,
  });
}

/**
 * Fetch onboarding progress into the Relay store + the Zustand onboarding store.
 * Non-suspending; on failure the store is marked loaded with whatever it already
 * holds so the chrome degrades gracefully instead of spinning forever.
 */
export function refreshOnboardingProgress(environment: IEnvironment): void {
  fetchQuery<OnboardingProgressRelayQueryType>(
    environment,
    onboardingProgressRelayQuery,
    {},
    { fetchPolicy: 'network-only' },
  ).subscribe({
    next: data => {
      if (data) syncOnboardingStore(data);
      // A null payload without a thrown error would otherwise leave `isLoaded` false
      // and the chrome spinning forever — mark loaded so it degrades gracefully.
      else useOnboardingStore.getState().setLoaded();
    },
    error: () => {
      useOnboardingStore.getState().setLoaded();
    },
  });
}
