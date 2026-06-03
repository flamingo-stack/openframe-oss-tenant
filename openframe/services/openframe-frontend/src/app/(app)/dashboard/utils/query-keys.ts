'use client';

/**
 * Centralized query key factory for dashboard React Query hooks
 */

export const dashboardQueryKeys = {
  // Root dashboard key
  all: ['dashboard'] as const,

  // Device statistics
  deviceStats: () => [...dashboardQueryKeys.all, 'device-stats'] as const,

  // Ticket statistics (SaaS mode only)
  ticketStats: () => [...dashboardQueryKeys.all, 'ticket-stats'] as const,

  // Organization statistics
  orgStats: (limit: number) => [...dashboardQueryKeys.all, 'org-stats', { limit }] as const,

  // SSO provider count (onboarding)
  ssoProviders: () => [...dashboardQueryKeys.all, 'sso-providers'] as const,

  // User statistics (onboarding)
  userStats: () => [...dashboardQueryKeys.all, 'user-stats'] as const,

  // Invalidate all dashboard queries
  invalidateAll: () => dashboardQueryKeys.all,
} as const;
