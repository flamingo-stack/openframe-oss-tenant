'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';

// Tickets live on the ai-agent GraphQL endpoint, not the main /api/graphql schema.
const TICKETS_GRAPHQL_ENDPOINT = '/chat/graphql';
const MAIN_GRAPHQL_ENDPOINT = '/api/graphql';

const TICKETS_TOTAL_QUERY = `
  query CancellationTicketTotal {
    ticketStatistics {
      statusCounts {
        status
        count
      }
    }
  }
`;

const KB_ARTICLES_QUERY = `
  query CancellationKbArticles {
    articles: knowledgeBaseItems(filter: { type: ARTICLE }, first: 1) {
      filteredCount
    }
  }
`;

// ACTIVE only — the default (null statuses) also counts ARCHIVED scripts, which
// aren't "data you'll lose" in the same sense.
const SCRIPTS_QUERY = `
  query CancellationScripts {
    scripts(filter: { statuses: [ACTIVE] }, first: 1) {
      filteredCount
    }
  }
`;

interface GraphQlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface CancellationImpact {
  /** Total tickets across every status (active, on-hold, resolved, …). */
  tickets: number;
  kbArticles: number;
  scripts: number;
  monitoringPolicies: number;
  savedQueries: number;
}

async function fetchTicketsTotal(): Promise<number> {
  const res = await apiClient.post<GraphQlEnvelope<{ ticketStatistics?: { statusCounts?: Array<{ count: number }> } }>>(
    TICKETS_GRAPHQL_ENDPOINT,
    { query: TICKETS_TOTAL_QUERY },
  );
  if (!res.ok || res.data?.errors?.length) {
    throw new Error(res.error || res.data?.errors?.[0]?.message || 'Failed to load ticket total');
  }
  const counts = res.data?.data?.ticketStatistics?.statusCounts ?? [];
  return counts.reduce((sum, sc) => sum + (sc.count ?? 0), 0);
}

async function fetchKbArticles(): Promise<number> {
  const res = await apiClient.post<GraphQlEnvelope<{ articles?: { filteredCount: number } }>>(MAIN_GRAPHQL_ENDPOINT, {
    query: KB_ARTICLES_QUERY,
  });
  if (!res.ok || res.data?.errors?.length) {
    throw new Error(res.error || res.data?.errors?.[0]?.message || 'Failed to load knowledge base count');
  }
  return res.data?.data?.articles?.filteredCount ?? 0;
}

async function fetchScriptsCount(): Promise<number> {
  const res = await apiClient.post<GraphQlEnvelope<{ scripts?: { filteredCount: number } }>>(MAIN_GRAPHQL_ENDPOINT, {
    query: SCRIPTS_QUERY,
  });
  if (!res.ok || res.data?.errors?.length) {
    throw new Error(res.error || res.data?.errors?.[0]?.message || 'Failed to load scripts count');
  }
  return res.data?.data?.scripts?.filteredCount ?? 0;
}

/**
 * Best-effort "what you'll lose" counts for the cancellation modal. Sourced from three
 * transports (ai-agent GraphQL, main GraphQL, Fleet REST); each is settled independently so
 * one failing source still shows the rest. Fetched lazily — only while the modal is open.
 * Read-only ancillary data, so failures degrade to 0 silently rather than toasting.
 */
export function useCancellationImpact({ enabled }: { enabled: boolean }) {
  const query = useQuery<CancellationImpact>({
    queryKey: ['cancellation-impact'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [tickets, kbArticles, scripts, policies, queries] = await Promise.allSettled([
        fetchTicketsTotal(),
        fetchKbArticles(),
        fetchScriptsCount(),
        fleetApiClient.getPoliciesCount(),
        fleetApiClient.getQueriesCount(),
      ]);

      return {
        tickets: tickets.status === 'fulfilled' ? tickets.value : 0,
        kbArticles: kbArticles.status === 'fulfilled' ? kbArticles.value : 0,
        scripts: scripts.status === 'fulfilled' ? scripts.value : 0,
        monitoringPolicies:
          policies.status === 'fulfilled' && policies.value.ok ? (policies.value.data?.count ?? 0) : 0,
        savedQueries: queries.status === 'fulfilled' && queries.value.ok ? (queries.value.data?.count ?? 0) : 0,
      };
    },
  });

  return { impact: query.data, isLoading: query.isLoading && enabled };
}
