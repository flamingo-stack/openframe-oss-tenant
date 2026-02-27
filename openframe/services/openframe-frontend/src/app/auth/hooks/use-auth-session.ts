'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { runtimeEnv } from '@/lib/runtime-config';
import { useAuthStore } from '../stores/auth-store';

export const authSessionQueryKey = ['auth', 'session'] as const;

interface MeResponse {
  authenticated: boolean;
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    roles?: string[];
    tenantId?: string;
    tenantName?: string;
    organizationId?: string;
    organizationName?: string;
    status?: string;
    image?: { imageUrl: string; hash: string };
  };
}

/**
 * Single source of truth for auth verification.
 * Uses React Query to deduplicate /me calls, with periodic rechecks.
 */
export function useAuthSession() {
  const queryClient = useQueryClient();
  const storeLogin = useAuthStore(s => s.login);
  const storeLogout = useAuthStore(s => s.logout);
  const setTenantId = useAuthStore(s => s.setTenantId);
  const fetchFullProfile = useAuthStore(s => s.fetchFullProfile);

  const query = useQuery<MeResponse | null>({
    queryKey: authSessionQueryKey,
    queryFn: async () => {
      const response = await apiClient.me<MeResponse>();
      if (response.ok && response.data?.authenticated) {
        return response.data;
      }
      if (response.status === 401) {
        return null;
      }
      // For other errors (network, 5xx), return null but don't clear auth
      return null;
    },
    staleTime: 4 * 60 * 1000, // 4 minutes
    refetchInterval: runtimeEnv.authCheckIntervalMs(), // Periodic recheck (default 5 min)
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 1000,
  });

  // Sync React Query data to Zustand auth store
  useEffect(() => {
    if (query.isLoading) return;

    if (query.data?.authenticated && query.data.user) {
      const userData = query.data.user;
      storeLogin({
        id: userData.id || userData.userId || '',
        email: userData.email || '',
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        roles: userData.roles,
        tenantId: userData.tenantId,
        tenantName: userData.tenantName,
        organizationId: userData.organizationId,
        organizationName: userData.organizationName,
        status: userData.status,
        image: userData.image,
      });

      const tenantId = userData.tenantId || userData.organizationId;
      if (tenantId) {
        setTenantId(tenantId);
      }

      // Fetch full profile in the background (non-blocking)
      fetchFullProfile();
    } else if (query.data === null && !query.isLoading) {
      // Only logout if we got a definitive "not authenticated" response
      // and we're not still loading
      const currentState = useAuthStore.getState();
      if (currentState.isAuthenticated && query.fetchStatus === 'idle') {
        // Session expired - clear state
        storeLogout();
      }
    }
  }, [query.data, query.isLoading, query.fetchStatus, storeLogin, storeLogout, setTenantId, fetchFullProfile]);

  const recheck = () => {
    queryClient.invalidateQueries({ queryKey: authSessionQueryKey });
  };

  return {
    isReady: !query.isLoading,
    isAuthenticated: !!query.data?.authenticated,
    user: query.data?.user ?? null,
    recheck,
  };
}

/**
 * Invalidate the auth session query from outside React components.
 * Useful for login success handlers that need to trigger a recheck.
 */
export function invalidateAuthSession(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: authSessionQueryKey });
}
