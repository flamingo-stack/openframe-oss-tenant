'use client';

/**
 * Centralized query key factory for dashboard React Query hooks
 */

export const dashboardQueryKeys = {
  // Root dashboard key
  all: ['dashboard'] as const,

  // Device statistics
  deviceStats: () => [...dashboardQueryKeys.all, 'device-stats'] as const,

  // Chat statistics (SaaS mode only)
  chatStats: () => [...dashboardQueryKeys.all, 'chat-stats'] as const,

  // Organization statistics
  orgStats: (limit: number) => [...dashboardQueryKeys.all, 'org-stats', { limit }] as const,

  // Invalidate all dashboard queries
  invalidateAll: () => dashboardQueryKeys.all,
} as const;
