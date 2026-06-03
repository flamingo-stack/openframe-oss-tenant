'use client';

import { useEffect, useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';

export interface SsoProvider {
  provider: string;
  enabled: boolean;
}

interface RegistrationProvidersResponse {
  providers: string[];
}

export function useRegistrationProviders() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authApiClient.getRegistrationProviders<RegistrationProvidersResponse>();

        if (response.ok && response.data?.providers) {
          const formattedProviders = response.data.providers.map(provider => ({
            provider,
            enabled: true,
          }));
          setProviders(formattedProviders);
        } else {
          setProviders([]);
          setError(response.error || 'Failed to fetch providers');
        }
      } catch (err) {
        console.error('Failed to fetch SSO providers:', err);
        setProviders([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  return {
    providers,
    loading,
    error,
  };
}
