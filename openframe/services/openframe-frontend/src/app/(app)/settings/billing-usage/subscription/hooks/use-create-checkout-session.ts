'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { graphql, useMutation } from 'react-relay';
import type {
  CheckoutInput,
  ProductCheckoutInput,
  useCreateCheckoutSessionMutation as UseCreateCheckoutSessionMutationType,
} from '@/__generated__/useCreateCheckoutSessionMutation.graphql';

export type { CheckoutInput, ProductCheckoutInput };

const createCheckoutSessionMutation = graphql`
  mutation useCreateCheckoutSessionMutation($input: CheckoutInput!) {
    createCheckoutSession(input: $input) {
      checkoutUrl
    }
  }
`;

export function useCreateCheckoutSession() {
  const { toast } = useToast();
  const [commit, isInFlight] = useMutation<UseCreateCheckoutSessionMutationType>(createCheckoutSessionMutation);

  const mutate = useCallback(
    (input: CheckoutInput) => {
      commit({
        variables: { input },
        onCompleted: response => {
          const url = response.createCheckoutSession?.checkoutUrl;
          if (!url) {
            toast({
              title: 'Checkout Failed',
              description: 'No checkout URL was returned. Please try again later.',
              variant: 'destructive',
            });
            return;
          }
          toast({
            title: 'Redirecting to Checkout',
            description: 'Complete your payment to activate your subscription.',
            variant: 'success',
          });
          window.location.href = url;
        },
        onError: err => {
          toast({
            title: 'Checkout Failed',
            description: err instanceof Error ? err.message : 'Failed to start checkout',
            variant: 'destructive',
          });
        },
      });
    },
    [commit, toast],
  );

  return { mutate, isPending: isInFlight };
}
