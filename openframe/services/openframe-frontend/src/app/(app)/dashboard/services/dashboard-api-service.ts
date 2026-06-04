'use client';

import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../devices/constants/device-statuses';
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries';
import type { GraphQlResponse } from '../../devices/types/device.types';
import { API_ENDPOINTS, TICKET_STATUS } from '../../tickets/constants';
import { GET_TICKET_STATISTICS_QUERY } from '../../tickets/queries/ticket-queries';
import { resolvedCountFromStatistics, type TicketStatisticsCounts } from '../../tickets/utils/ticket-statistics';

// ============ Types ============

export interface DashboardDeviceStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
  inactivePercentage: number;
}

export interface DashboardTicketStats {
  total: number;
  active: number;
  resolved: number;
  avgResolveTime: string;
  avgFaeRate: number;
  activePercentage: number;
  resolvedPercentage: number;
}

interface DeviceFiltersResponse {
  deviceFilters: {
    filteredCount: number;
    statuses?: Array<{ value: string; count: number }>;
  };
}

interface TicketStatsResponse {
  ticketStatistics: TicketStatisticsCounts & {
    totalCount: number;
    averageResolutionTimeFormatted: string;
    averageRating: number;
  };
}

// ============ Dashboard API Service ============

class DashboardApiService {
  private static instance: DashboardApiService | null = null;

  static getInstance(): DashboardApiService {
    if (!DashboardApiService.instance) {
      DashboardApiService.instance = new DashboardApiService();
    }
    return DashboardApiService.instance;
  }

  private constructor() {}

  private handleApiError(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    return new Error(`${operation} failed: Unknown error occurred`);
  }

  /**
   * Single GraphQL query for device counts and status breakdown
   */
  async fetchDeviceStats(): Promise<DashboardDeviceStats> {
    try {
      const response = await apiClient.post<GraphQlResponse<DeviceFiltersResponse>>('/api/graphql', {
        query: GET_DEVICE_FILTERS_QUERY,
        variables: { filter: { statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE] } },
      });

      if (!response.ok) {
        throw new Error(response.error || `Device stats request failed with status ${response.status}`);
      }

      const data = response.data?.data?.deviceFilters;
      if (!data) {
        throw new Error('Invalid device stats response structure');
      }

      const total = data.filteredCount || 0;
      const statuses = data.statuses || [];
      const active = statuses.find(s => s.value === DEVICE_STATUS.ONLINE)?.count || 0;
      const inactive = statuses.find(s => s.value === DEVICE_STATUS.OFFLINE)?.count || 0;

      return {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
        inactivePercentage: total > 0 ? Math.round((inactive / total) * 100) : 0,
      };
    } catch (error) {
      throw this.handleApiError(error, 'Device stats fetch');
    }
  }

  /**
   * Fetch ticket statistics for SaaS mode.
   * Previously hit the legacy `dialogStatistics` query — replaced with
   * `ticketStatistics` after the backend split tickets out from dialogs.
   */
  async fetchTicketStats(): Promise<DashboardTicketStats> {
    try {
      const response = await apiClient.post<GraphQlResponse<TicketStatsResponse>>(API_ENDPOINTS.GRAPHQL, {
        query: GET_TICKET_STATISTICS_QUERY,
      });

      if (!response.ok) {
        throw new Error(response.error || `Ticket stats request failed with status ${response.status}`);
      }

      const data = response.data?.data?.ticketStatistics;
      if (!data) {
        throw new Error('Invalid ticket stats response structure');
      }

      const total = data.totalCount || 0;
      const active = (data.statusCounts || []).find(s => s.status === TICKET_STATUS.ACTIVE)?.count || 0;
      const resolved = resolvedCountFromStatistics(data);

      return {
        total,
        active,
        resolved,
        avgResolveTime: data.averageResolutionTimeFormatted || '—',
        avgFaeRate: typeof data.averageRating === 'number' ? Number(data.averageRating.toFixed(1)) : 0,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
        resolvedPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
      };
    } catch (error) {
      throw this.handleApiError(error, 'Ticket stats fetch');
    }
  }
}

export const dashboardApiService = DashboardApiService.getInstance();
