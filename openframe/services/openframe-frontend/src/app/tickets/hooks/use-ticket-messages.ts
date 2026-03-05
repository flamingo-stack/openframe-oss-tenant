import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ChatType } from '../constants';
import { GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries';
import type { CursorPageInfo, Message } from '../types/dialog.types';

interface MessagePage {
  messages: Message[];
  pageInfo: CursorPageInfo;
}

interface MessagesResponse {
  data?: {
    messages: {
      edges: Array<{ cursor: string; node: Message }>;
      pageInfo: CursorPageInfo;
    };
  };
}

export function useTicketMessages(dialogId: string | null, chatType: ChatType) {
  const messagesQuery = useInfiniteQuery({
    queryKey: ['ticket-dialog-messages', dialogId, chatType],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!dialogId) {
        return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
      }

      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: {
          dialogId,
          chatType,
          cursor: pageParam,
          limit: 50,
          sortField: 'createdAt',
          sortDirection: 'DESC',
        },
      });

      if (!response.ok || !response.data?.data?.messages) {
        throw new Error(response.error || 'Failed to fetch messages');
      }

      const { edges, pageInfo } = response.data.data.messages;

      return {
        messages: edges.map(edge => edge.node),
        pageInfo,
      };
    },
    getNextPageParam: (lastPage: MessagePage) => {
      return lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!dialogId,
    staleTime: 30 * 1000,
  });

  const messages = useMemo(() => {
    if (!messagesQuery.data?.pages) return [] as Message[];
    return [...messagesQuery.data.pages].reverse().flatMap(p => [...p.messages].reverse());
  }, [messagesQuery.data?.pages]);

  return {
    messages,
    isLoading: messagesQuery.isLoading,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
    error: messagesQuery.error?.message || null,
  };
}
