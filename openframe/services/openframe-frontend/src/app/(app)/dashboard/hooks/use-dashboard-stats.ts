'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isSaasTenantMode } from '@/lib/app-mode';
import { dashboardApiService } from '../services/dashboard-api-service';
import { dashboardQueryKeys } from '../utils/query-keys';

export function useDevicesOverview() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

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
    pending: query.data?.pending ?? 0,
    archived: query.data?.archived ?? 0,
    activePercentage: query.data?.activePercentage ?? 0,
    inactivePercentage: query.data?.inactivePercentage ?? 0,
    pendingPercentage: query.data?.pendingPercentage ?? 0,
    archivedPercentage: query.data?.archivedPercentage ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useTicketsOverview() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isSaasMode = isSaasTenantMode();

  const query = useQuery({
    queryKey: dashboardQueryKeys.ticketStats(),
    queryFn: dashboardApiService.fetchTicketStats,
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
    aiAssistance: query.data?.aiAssistance ?? 0,
    techRequired: query.data?.techRequired ?? 0,
    otherStatuses: query.data?.otherStatuses ?? 0,
    techRequiredColor: query.data?.techRequiredColor,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useSharedDashboardData() {
  const devicesQuery = useDevicesOverview();
  const ticketsQuery = useTicketsOverview();

  return {
    devices: {
      data: devicesQuery,
      isLoading: devicesQuery.isLoading,
    },
    tickets: {
      data: ticketsQuery,
      isLoading: ticketsQuery.isLoading,
    },
    isAnyLoading: devicesQuery.isLoading || ticketsQuery.isLoading,
    refetchAll: () => {
      devicesQuery.refetch();
      ticketsQuery.refetch();
    },
  };
}
