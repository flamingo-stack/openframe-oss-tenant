'use client';

import { type ReactNode, Suspense } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { subscriptionGuardQuery as SubscriptionGuardQueryType } from '@/__generated__/subscriptionGuardQuery.graphql';
import { featureFlags } from '@/lib/feature-flags';
import { useSubscriptionLockSignal } from '@/lib/subscription-lock-signal';
import { SubscriptionLockProvider } from './subscription-lock-context';
import { resolveSubscriptionStatus, SubscriptionStatus } from './subscription-status';

const subscriptionGuardQuery = graphql`
  query subscriptionGuardQuery {
    subscription {
      id
      status
    }
  }
`;

interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Resolves the current subscription status and provides it via context so the
 * rest of the app can react to lock state. Deliberately does NOT redirect —
 * the actual swap of the main content happens in `AppShell` based on the
 * context, which keeps rendering synchronous and avoids redirect races.
 */
export function SubscriptionGuard({ children, fallback = null }: SubscriptionGuardProps) {
  if (!featureFlags.subscription.enabled()) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <SubscriptionGuardInner>{children}</SubscriptionGuardInner>
    </Suspense>
  );
}

function SubscriptionGuardInner({ children }: { children: ReactNode }) {
  const trialExpiredFromErrors = useSubscriptionLockSignal(s => s.trialExpiredFromErrors);
  const data = useLazyLoadQuery<SubscriptionGuardQueryType>(
    subscriptionGuardQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );
  const status = resolveGuardStatus({
    subscription: data.subscription,
    trialExpiredFromErrors,
  });
  return <SubscriptionLockProvider status={status}>{children}</SubscriptionLockProvider>;
}

function resolveGuardStatus({
  subscription,
  trialExpiredFromErrors,
}: {
  subscription: SubscriptionGuardQueryType['response']['subscription'];
  trialExpiredFromErrors: boolean;
}): SubscriptionStatus {
  if (trialExpiredFromErrors) return SubscriptionStatus.TRIAL_EXPIRED;
  if (subscription == null) return SubscriptionStatus.CANCELED;
  return resolveSubscriptionStatus(subscription.status);
}
