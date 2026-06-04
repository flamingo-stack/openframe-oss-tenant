import { featureFlags } from '@/lib/feature-flags';
import { TICKET_STATUS } from '../constants';

export interface TicketStatusCount {
  status: string;
  count: number;
}

export interface TicketStatusDefinitionCount {
  status: { kind: string };
  count: number;
}

export interface TicketStatisticsCounts {
  statusCounts?: TicketStatusCount[];
  statusDefinitionCounts?: TicketStatusDefinitionCount[];
}

export function resolvedCountFromStatistics(stats: TicketStatisticsCounts | undefined): number {
  if (!stats) return 0;
  if (featureFlags.ticketStatuses.enabled()) {
    return (stats.statusDefinitionCounts ?? []).find(c => c.status.kind === TICKET_STATUS.RESOLVED)?.count ?? 0;
  }
  return (stats.statusCounts ?? []).find(c => c.status === TICKET_STATUS.RESOLVED)?.count ?? 0;
}
