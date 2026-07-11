'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { commitLocalUpdate, graphql, useMutation, useRelayEnvironment } from 'react-relay';
import type { useCancelSubscriptionMutation as UseCancelSubscriptionMutationType } from '@/__generated__/useCancelSubscriptionMutation.graphql';

const cancelSubscriptionMutation = graphql`
  mutation useCancelSubscriptionMutation($input: CancelSubscriptionInput) {
    cancelSubscription(input: $input)
  }
`;

interface CancelSubscriptionOptions {
  reason?: string;
  description?: string;
  onSuccess?: () => void;
}

export function useCancelSubscription() {
  const { toast } = useToast();
  const environment = useRelayEnvironment();
  const [commit, isInFlight] = useMutation<UseCancelSubscriptionMutationType>(cancelSubscriptionMutation);

  const mutate = useCallback(
    (options?: CancelSubscriptionOptions) => {
      const { reason, description, onSuccess } = options ?? {};
      const input = reason || description ? { reason: reason ?? null, description: description ?? null } : null;
      commit({
        variables: { input },
        onCompleted: () => {
          // The mutation returns a bare Boolean, so Relay can't reconcile the new
          // PENDING_CANCELLATION state on its own. Invalidate the store so every
          // subscription-derived query (billing view, subscription-lock, …)
          // refetches from the server on its next read instead of serving stale data.
          commitLocalUpdate(environment, store => store.invalidateStore());
          onSuccess?.();
        },
        onError: err => {
          toast({
            title: 'Cancel Failed',
            description: err instanceof Error ? err.message : 'Failed to cancel subscription',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast, environment],
  );

  return { mutate, isPending: isInFlight };
}
