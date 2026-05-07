import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { authApiClient } from '@/lib/auth-api-client';
import { authSessionQueryKey } from './use-auth-session';
import { useTokenStorage } from './use-token-storage';

/**
 * Hook for exchanging devTicket via API.
 * After successful exchange, triggers useAuthSession recheck
 */
export function useDevTicketExchange() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { storeTokensFromHeaders } = useTokenStorage();

  const exchangeTicket = useCallback(
    async (ticket: string) => {
      try {
        const response = await authApiClient.devExchange(ticket);

        if (!response.ok) {
          throw new Error(`DevTicket exchange failed with status ${response.status}`);
        }

        const tokens = storeTokensFromHeaders(response.headers);

        if (tokens.accessToken || tokens.refreshToken) {
          // Trigger auth session recheck — useAuthSession will handle
          // syncing user data to the store
          await queryClient.invalidateQueries({ queryKey: authSessionQueryKey });

          toast({
            title: 'Welcome!',
            description: 'Successfully signed in',
            variant: 'success',
          });

          router.push('/dashboard');
        }

        return {
          success: response.ok,
          status: response.status,
          tokens,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to exchange devTicket';

        toast({
          title: 'Exchange Failed',
          description: message,
          variant: 'destructive',
        });

        return {
          success: false,
          status: 0,
          tokens: { accessToken: null, refreshToken: null },
        };
      }
    },
    [storeTokensFromHeaders, toast, queryClient, router],
  );

  return { exchangeTicket };
}
