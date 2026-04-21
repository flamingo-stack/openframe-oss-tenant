'use client';

import { type ReactNode, Suspense } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { subscriptionGuardQuery as SubscriptionGuardQueryType } from '@/__generated__/subscriptionGuardQuery.graphql';
import { featureFlags } from '@/lib/feature-flags';
import { SubscriptionLockProvider } from './subscription-lock-context';
import { resolveSubscriptionStatus } from './subscription-status';

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
  const data = useLazyLoadQuery<SubscriptionGuardQueryType>(
    subscriptionGuardQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  const status = resolveSubscriptionStatus(data.subscription?.status);
  return <SubscriptionLockProvider status={status}>{children}</SubscriptionLockProvider>;
}
