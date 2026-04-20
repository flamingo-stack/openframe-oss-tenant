import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ChatType } from '../constants';
import { getDialogService } from '../services';
import type { MessagePage } from '../services/dialog-service.types';
import type { Message } from '../types/dialog.types';
import { useDialogVersion } from './use-dialog-version';

export function useTicketMessages(dialogId: string | null, chatType: ChatType) {
  const version = useDialogVersion();
  const service = getDialogService(version);

  const messagesQuery = useInfiniteQuery({
    queryKey: ['ticket-dialog-messages', dialogId, chatType],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!dialogId) {
        return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
      }

      return service.fetchMessages({
        dialogId,
        chatType,
        cursor: pageParam,
        limit: 50,
        sortField: 'createdAt',
        sortDirection: 'DESC',
      });
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
    rawPages: messagesQuery.data?.pages,
    isLoading: messagesQuery.isLoading,
    isFetched: messagesQuery.isFetched,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
    error: messagesQuery.error?.message || null,
  };
}
