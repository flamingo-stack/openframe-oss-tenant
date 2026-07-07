'use client';

import { useEffect, useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';

export interface SsoProvider {
  provider: string;
  enabled: boolean;
}

interface InviteProvidersResponse {
  providers: string[];
  /** Invited email, when the endpoint returns it (shown read-only on the accept screen). */
  email?: string;
}

export function useInviteProviders(invitationId: string | null) {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(!!invitationId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      if (!invitationId) {
        setProviders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await authApiClient.getInviteProviders<InviteProvidersResponse>(invitationId);

        if (response.ok && response.data?.providers) {
          const formattedProviders = response.data.providers.map(provider => ({
            provider,
            enabled: true,
          }));
          setProviders(formattedProviders);
          setEmail(response.data.email ?? '');
        } else {
          setProviders([]);
          const errorMessage = (response.data as any)?.message || response.error || 'Failed to fetch providers';
          console.log({ response });
          setError(errorMessage);
        }
      } catch (err) {
        console.error('Failed to fetch SSO providers for invitation:', err);
        setProviders([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [invitationId]);

  return {
    providers,
    email,
    loading,
    error,
  };
}
