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
import { routes } from '@/lib/routes';

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

          // An upgrade may generate a pending invoice; a downgrade doesn't. We no
          // longer auto-open the invoice — use a neutral message that points the
          // user to the invoices list without asserting an invoice was created.
          toast({
            title: 'Subscription Updated',
            description:
              'Your changes have been applied. Check the invoices list in Billing & Usage for any pending payments.',
            variant: 'success',
          });

          router.push(routes.settings.billingUsage);
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
