'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type { useResumeSubscriptionMutation as UseResumeSubscriptionMutationType } from '@/__generated__/useResumeSubscriptionMutation.graphql';

// Clears a scheduled cancellation (status PENDING_CANCELLATION) in Stripe so the
// subscription renews again. Only valid while still inside the paid period — a
// fully canceled subscription must go through checkout instead. Takes no input
// and returns a Boolean, so the Relay store can't auto-update; callers refetch
// the billing query via `onSuccess`.
const resumeSubscriptionMutation = graphql`
  mutation useResumeSubscriptionMutation {
    resumeSubscription
  }
`;

interface ResumeSubscriptionOptions {
  onSuccess?: () => void;
}

export function useResumeSubscription() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseResumeSubscriptionMutationType>(resumeSubscriptionMutation);

  const mutate = useCallback(
    (options?: ResumeSubscriptionOptions) => {
      const { onSuccess } = options ?? {};
      commit({
        variables: {},
        onCompleted: (response, errors) => {
          if (errors?.length || !response.resumeSubscription) {
            toast({
              title: 'Renew Failed',
              description: errors?.map(e => e.message).join('. ') || 'Failed to renew subscription',
              variant: 'destructive',
            });
            return;
          }
          toast({
            title: 'Subscription Renewed',
            description: 'Your subscription will continue and the scheduled cancellation was removed.',
            variant: 'success',
          });
          onSuccess?.();
        },
        onError: err => {
          toast({
            title: 'Renew Failed',
            description: err instanceof Error ? err.message : 'Failed to renew subscription',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { mutate, isPending: isInFlight };
}
