import { featureFlags } from '@/lib/feature-flags';
import { TICKET_STATUS } from '../constants';

export interface TicketStatusCount {
  status: string;
  count: number;
}

export interface TicketStatusDefinitionCount {
  status: { kind: string; color?: string };
  count: number;
}

export interface TicketStatisticsCounts {
  statusCounts?: TicketStatusCount[];
  statusDefinitionCounts?: TicketStatusDefinitionCount[];
}

// Backend status-definition kinds (mirror the lifecycle TicketStatusKind enum).
export const TICKET_STATUS_KIND = {
  AI_ASSISTANCE: 'AI_ASSISTANCE',
  TECH_REQUIRED: 'TECH_REQUIRED',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
  CUSTOM: 'CUSTOM',
} as const;

function sumKindCount(stats: TicketStatisticsCounts | undefined, kind: string): number {
  return (stats?.statusDefinitionCounts ?? [])
    .filter(c => c.status.kind === kind)
    .reduce((total, c) => total + c.count, 0);
}

export function kindColorFromStatistics(stats: TicketStatisticsCounts | undefined, kind: string): string | undefined {
  return (stats?.statusDefinitionCounts ?? []).find(c => c.status.kind === kind)?.status.color ?? undefined;
}

export function resolvedCountFromStatistics(stats: TicketStatisticsCounts | undefined): number {
  if (!stats) return 0;
  if (featureFlags.ticketStatuses.enabled()) {
    return sumKindCount(stats, TICKET_STATUS_KIND.RESOLVED);
  }
  return (stats.statusCounts ?? []).find(c => c.status === TICKET_STATUS.RESOLVED)?.count ?? 0;
}

export interface TicketKindCounts {
  aiAssistance: number;
  techRequired: number;
  resolved: number;
  // Sum across every CUSTOM-kind status.
  otherStatuses: number;
}

export function kindCountsFromStatistics(stats: TicketStatisticsCounts | undefined): TicketKindCounts {
  return {
    aiAssistance: sumKindCount(stats, TICKET_STATUS_KIND.AI_ASSISTANCE),
    techRequired: sumKindCount(stats, TICKET_STATUS_KIND.TECH_REQUIRED),
    resolved: sumKindCount(stats, TICKET_STATUS_KIND.RESOLVED),
    otherStatuses: sumKindCount(stats, TICKET_STATUS_KIND.CUSTOM),
  };
}
