'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type {
  PackageUpdateInput,
  UpdateSubscriptionInput,
  useUpdateSubscriptionMutation as UseUpdateSubscriptionMutationType,
} from '@/__generated__/useUpdateSubscriptionMutation.graphql';

export type { PackageUpdateInput, UpdateSubscriptionInput };

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
  const router = useRouter();
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

          // An upgrade generates a pending invoice; a downgrade doesn't. We no
          // longer auto-open the invoice — point the user to the invoices list
          // instead, and word the downgrade case (no invoice) accordingly.
          const hasPendingInvoice = result.subscription.pendingInvoices.length > 0;

          toast({
            title: 'Subscription Updated',
            description: hasPendingInvoice
              ? 'An invoice was generated for your changes — check the invoices list in Billing & Usage to complete payment.'
              : "Your changes have been applied and take effect from your next billing cycle. No invoice is needed — you'll see it reflected in your invoices list.",
            variant: 'success',
          });

          router.push('/settings/billing-usage');
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
    [commit, toast, router],
  );

  return { mutate, isPending: isInFlight };
}
