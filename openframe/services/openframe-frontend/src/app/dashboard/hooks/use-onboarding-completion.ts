'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '@/app/auth/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { dashboardQueryKeys } from '../utils/query-keys';
import { useDevicesOverview } from './use-dashboard-stats';
import { useOrganizationsOverview } from './use-organizations-overview';

// SSO providers query
function useActiveSsoProviderCount() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const query = useQuery({
    queryKey: dashboardQueryKeys.ssoProviders(),
    queryFn: async () => {
      const providersRes =
        await apiClient.get<Array<{ provider: string; displayName: string }>>('api/sso/providers/available');
      if (!providersRes.ok || !Array.isArray(providersRes.data)) {
        return 0;
      }

      const configs = await Promise.all(
        providersRes.data.map(p =>
          apiClient
            .get<{ enabled: boolean }>(`api/sso/${encodeURIComponent(p.provider)}`)
            .then(r => (r.ok ? r.data : null)),
        ),
      );

      return configs.filter(cfg => cfg?.enabled === true).length;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
  };
}

// Users count query
function useUsersCount() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const query = useQuery({
    queryKey: dashboardQueryKeys.userStats(),
    queryFn: async () => {
      const res = await apiClient.post<any>('/api/graphql', {
        query: `query { users(pagination: { limit: 1 }) { filteredCount } }`,
      });
      if (!res.ok) return 0;
      return res.data?.data?.users?.filteredCount ?? 0;
    },
    enabled: isAuthenticated,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    totalElements: query.data ?? 0,
    isLoading: query.isLoading,
  };
}

/**
 * Hook to check onboarding step completion.
 */
export function useOnboardingCompletion() {
  const { total: deviceCount, isLoading: devicesLoading } = useDevicesOverview();
  const { totalOrganizations, loading: orgsLoading } = useOrganizationsOverview();
  const { count: ssoProvidersCount, isLoading: ssoLoading } = useActiveSsoProviderCount();
  const { totalElements, isLoading: usersLoading } = useUsersCount();

  const isLoading = orgsLoading || devicesLoading || usersLoading || ssoLoading;

  const completionStatus = useMemo(
    () => ({
      'sso-configuration': ssoProvidersCount > 0,
      'organizations-setup': totalOrganizations > 1,
      'device-management': deviceCount > 0,
      'company-and-team': totalElements > 1,
    }),
    [ssoProvidersCount, totalOrganizations, deviceCount, totalElements],
  );

  return {
    completionStatus,
    isLoading,
  };
}
