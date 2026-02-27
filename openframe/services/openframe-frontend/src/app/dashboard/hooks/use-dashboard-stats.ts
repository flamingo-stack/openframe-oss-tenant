'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/app/auth/hooks/use-auth-session';
import { isSaasTenantMode } from '@/lib/app-mode';
import { dashboardApiService } from '../services/dashboard-api-service';
import { dashboardQueryKeys } from '../utils/query-keys';

export function useDevicesOverview() {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: dashboardQueryKeys.deviceStats(),
    queryFn: dashboardApiService.fetchDeviceStats,
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    total: query.data?.total ?? 0,
    active: query.data?.active ?? 0,
    inactive: query.data?.inactive ?? 0,
    activePercentage: query.data?.activePercentage ?? 0,
    inactivePercentage: query.data?.inactivePercentage ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useChatsOverview() {
  const { isAuthenticated } = useAuthSession();
  const isSaasMode = isSaasTenantMode();

  const query = useQuery({
    queryKey: dashboardQueryKeys.chatStats(),
    queryFn: dashboardApiService.fetchChatStats,
    enabled: isSaasMode && isAuthenticated,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    total: query.data?.total ?? 0,
    active: query.data?.active ?? 0,
    resolved: query.data?.resolved ?? 0,
    avgResolveTime: query.data?.avgResolveTime ?? '—',
    avgFaeRate: query.data?.avgFaeRate ?? 0,
    activePercentage: query.data?.activePercentage ?? 0,
    resolvedPercentage: query.data?.resolvedPercentage ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useSharedDashboardData() {
  const devicesQuery = useDevicesOverview();
  const chatsQuery = useChatsOverview();

  return {
    devices: {
      data: devicesQuery,
      isLoading: devicesQuery.isLoading,
    },
    chats: {
      data: chatsQuery,
      isLoading: chatsQuery.isLoading,
    },
    isAnyLoading: devicesQuery.isLoading || chatsQuery.isLoading,
    refetchAll: () => {
      devicesQuery.refetch();
      chatsQuery.refetch();
    },
  };
}
