import type { ChatTicketItemData } from '@flamingo-stack/openframe-frontend-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { type TicketNode, ticketGraphQlService } from '../services/ticketGraphQlService';

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ticketToItemData(ticket: TicketNode): ChatTicketItemData | null {
  // statusDefinition is only present when the ticket-statuses flag is on (it's
  // fetched behind @include), so mapping it unconditionally is safe.
  const def = ticket.statusDefinition;
  return {
    id: ticket.id,
    title: ticket.title || 'Untitled',
    ticketNumber: String(ticket.ticketNumber),
    status: ticket.status,
    statusLabel: def?.name,
    statusColor: def?.color,
    statusKind: def?.kind,
    category: ticket.labels?.[0]?.key,
    timeAgo: ticket.createdAt ? formatTimeAgo(ticket.createdAt) : undefined,
  };
}

const TICKET_STATUSES = ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'];

export function useTickets() {
  const { flags } = useFeatureFlags();
  const lifecycle = flags['ticket-statuses'];
  const dialogIdMapRef = useRef(new Map<string, string>());
  const creationSourceMapRef = useRef(new Map<string, string>());

  const { data, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = useInfiniteQuery({
    queryKey: ['tickets', lifecycle],
    queryFn: async ({ pageParam }) => {
      const connection = await ticketGraphQlService.getTickets({
        statuses: TICKET_STATUSES,
        cursor: pageParam,
        limit: 20,
        lifecycle,
      });

      if (!connection?.edges) {
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }

      for (const edge of connection.edges) {
        if (edge.node.dialog?.id) {
          dialogIdMapRef.current.set(edge.node.id, edge.node.dialog.id);
        }
        if (edge.node.creationSource) {
          creationSourceMapRef.current.set(edge.node.id, edge.node.creationSource);
        }
      }

      return connection;
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => {
      if (lastPage.pageInfo.hasNextPage && lastPage.pageInfo.endCursor) {
        return lastPage.pageInfo.endCursor;
      }
      return undefined;
    },
    staleTime: 60_000,
    retry: 2,
    refetchInterval: 60_000,
  });

  const tickets = useMemo<ChatTicketItemData[]>(() => {
    if (!data?.pages) return [];

    const items: ChatTicketItemData[] = [];
    for (const page of data.pages) {
      for (const edge of page.edges) {
        const item = ticketToItemData(edge.node);
        if (item) items.push(item);
      }
    }
    return items;
  }, [data?.pages]);

  const getDialogId = useCallback((ticketId: string): string | null => {
    return dialogIdMapRef.current.get(ticketId) ?? null;
  }, []);

  const getCreationSource = useCallback((ticketId: string): string | null => {
    return creationSourceMapRef.current.get(ticketId) ?? null;
  }, []);

  const getTicketDetails = useCallback(
    async (
      ticketId: string,
    ): Promise<{
      title: string;
      description?: string;
      creationSource?: string;
      createdAt?: string;
      status?: string;
      statusName?: string;
      statusColor?: string;
      statusKind?: string;
      ticketNumber?: string;
      category?: string;
      timeAgo?: string;
    } | null> => {
      try {
        const ticket = await ticketGraphQlService.getTicket(ticketId, lifecycle);
        if (ticket) {
          const def = ticket.statusDefinition;
          return {
            title: ticket.title,
            description: ticket.description,
            creationSource: ticket.creationSource,
            createdAt: ticket.createdAt,
            status: ticket.status,
            statusName: def?.name,
            statusColor: def?.color,
            statusKind: def?.kind,
            ticketNumber: String(ticket.ticketNumber),
            category: ticket.labels?.[0]?.key,
            timeAgo: ticket.createdAt ? formatTimeAgo(ticket.createdAt) : undefined,
          };
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch ticket details:', error);
        return null;
      }
    },
    [lifecycle],
  );

  return {
    tickets,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
    getDialogId,
    getCreationSource,
    getTicketDetails,
  };
}
