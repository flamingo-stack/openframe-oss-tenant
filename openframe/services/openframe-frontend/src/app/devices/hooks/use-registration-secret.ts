'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export const registrationSecretQueryKeys = {
  active: ['registrationSecret', 'active'] as const,
};

async function fetchActiveSecret(): Promise<string> {
  const response = await apiClient.get<{ key?: string }>('/api/agent/registration-secret/active');
  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }
  if (!response.data?.key) {
    throw new Error('Active registration secret not found in response');
  }
  return response.data.key;
}

export function useRegistrationSecret() {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: registrationSecretQueryKeys.active,
    queryFn: fetchActiveSecret,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Failed to load registration secret',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  return {
    initialKey: query.data ?? '',
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
