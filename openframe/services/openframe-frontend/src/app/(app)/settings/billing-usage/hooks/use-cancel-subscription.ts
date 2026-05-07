'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
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
  const [commit, isInFlight] = useMutation<UseCancelSubscriptionMutationType>(cancelSubscriptionMutation);

  const mutate = useCallback(
    (options?: CancelSubscriptionOptions) => {
      const { reason, description, onSuccess } = options ?? {};
      const input = reason || description ? { reason: reason ?? null, description: description ?? null } : null;
      commit({
        variables: { input },
        onCompleted: () => {
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
    [commit, toast],
  );

  return { mutate, isPending: isInFlight };
}
