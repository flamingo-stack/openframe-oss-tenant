'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useCancelSubscriptionMutation as UseCancelSubscriptionMutationType } from '@/__generated__/useCancelSubscriptionMutation.graphql';

const cancelSubscriptionMutation = graphql`
  mutation useCancelSubscriptionMutation {
    cancelSubscription
  }
`;

export function useCancelSubscription() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseCancelSubscriptionMutationType>(cancelSubscriptionMutation);

  const mutate = useCallback(
    (options?: { onSuccess?: () => void }) => {
      commit({
        variables: {},
        onCompleted: () => {
          options?.onSuccess?.();
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
    [commit, toast],
  );

  return { mutate, isPending: isInFlight };
}
