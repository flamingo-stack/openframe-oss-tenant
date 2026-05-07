'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type {
  PackageUpdateInput,
  PaygUpdateInput,
  UpdateSubscriptionInput,
  useUpdateSubscriptionMutation as UseUpdateSubscriptionMutationType,
} from '@/__generated__/useUpdateSubscriptionMutation.graphql';

export type { PackageUpdateInput, PaygUpdateInput, UpdateSubscriptionInput };

const updateSubscriptionMutation = graphql`
  mutation useUpdateSubscriptionMutation($input: UpdateSubscriptionInput!) {
    updateSubscription(input: $input) {
      subscription {
        id
        status
        startDate
        currentPeriodEnd
        cancellationEffectiveAt
        pendingInvoices {
          id
          hostedInvoiceUrl
          createdAt
        }
      }
      errors {
        code
        message
        field
      }
    }
  }
`;

export function useUpdateSubscription() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseUpdateSubscriptionMutationType>(updateSubscriptionMutation);

  const mutate = useCallback(
    (input: UpdateSubscriptionInput) => {
      commit({
        variables: { input },
        onCompleted: response => {
          const result = response.updateSubscription;

          if (result.errors.length > 0) {
            toast({
              title: 'Update Failed',
              description: result.errors.map(e => e.message).join('. '),
              variant: 'destructive',
            });
            return;
          }

          const latestPending = [...result.subscription.pendingInvoices].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];

          if (latestPending) {
            toast({
              title: 'Redirecting to Payment',
              description: 'Complete your payment to activate changes.',
              variant: 'success',
            });
            window.location.href = latestPending.hostedInvoiceUrl;
            return;
          }

          toast({
            title: 'Subscription Updated',
            description: 'Your subscription changes have been applied.',
            variant: 'success',
          });
        },
        onError: err => {
          toast({
            title: 'Update Failed',
            description: err instanceof Error ? err.message : 'Failed to update subscription',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { mutate, isPending: isInFlight };
}
