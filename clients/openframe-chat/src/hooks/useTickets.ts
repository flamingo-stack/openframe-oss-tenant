import type { ChatTicketItemData } from '@flamingo-stack/openframe-frontend-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
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
  return {
    id: ticket.id,
    title: ticket.title || 'Untitled',
    ticketNumber: String(ticket.ticketNumber),
    status: ticket.status,
    category: ticket.labels?.[0]?.key,
    timeAgo: ticket.createdAt ? formatTimeAgo(ticket.createdAt) : undefined,
  };
}

const TICKET_STATUSES = ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'];

interface UseTicketsOptions {
  enabled?: boolean;
}

export function useTickets({ enabled = true }: UseTicketsOptions = {}) {
  const dialogIdMapRef = useRef(new Map<string, string>());
  const creationSourceMapRef = useRef(new Map<string, string>());

  const { data, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = useInfiniteQuery({
    queryKey: ['tickets'],
    enabled,
    queryFn: async ({ pageParam }) => {
      const connection = await ticketGraphQlService.getTickets({
        statuses: TICKET_STATUSES,
        cursor: pageParam,
        limit: 20,
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
    ): Promise<{ title: string; description?: string; creationSource?: string; createdAt?: string } | null> => {
      try {
        const ticket = await ticketGraphQlService.getTicket(ticketId);
        if (ticket) {
          return {
            title: ticket.title,
            description: ticket.description,
            creationSource: ticket.creationSource,
            createdAt: ticket.createdAt,
          };
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch ticket details:', error);
        return null;
      }
    },
    [],
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
