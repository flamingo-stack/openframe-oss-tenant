import {
  type ChatApprovalStatus,
  type Message,
  processHistoricalMessages,
} from '@flamingo-stack/openframe-frontend-core';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { dialogGraphQlService } from '../services/dialogGraphQLService';

interface UseDialogMessagesOptions {
  enabled?: boolean;
  onApprove?: (requestId?: string) => Promise<void> | void;
  onReject?: (requestId?: string) => Promise<void> | void;
  approvalStatuses?: Record<string, ChatApprovalStatus>;
}

export function useDialogMessages(dialogId: string | null, options: UseDialogMessagesOptions = {}) {
  const queryClient = useQueryClient();
  const { flags } = useFeatureFlags();
  const { onApprove, onReject, approvalStatuses } = options;

  const { data, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = useInfiniteQuery({
    queryKey: ['dialog-messages', dialogId],
    queryFn: async ({ pageParam }) => {
      const connection = await dialogGraphQlService.getDialogMessagesPage(dialogId!, pageParam, 50, {
        includeContextCompaction: flags['token-based-memory'],
      });
      if (!connection || !connection.edges) {
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
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
    enabled: !!dialogId && (options.enabled ?? false),
  });

  const { historicalMessages, escalatedApprovals } = useMemo(() => {
    if (!data?.pages) {
      return {
        historicalMessages: [] as Message[],
        escalatedApprovals: new Map() as Map<string, { command: string; explanation?: string; approvalType: string }>,
      };
    }

    const allNodes = [];
    const reversedPages = [...data.pages].reverse();
    for (const page of reversedPages) {
      const reversedEdges = [...page.edges].reverse();
      for (const edge of reversedEdges) {
        allNodes.push(edge.node);
      }
    }

    const result = processHistoricalMessages(allNodes, {
      onApprove,
      onReject,
      approvalStatuses,
      assistantAvatar: faeAvatar,
      displayApprovalTypes: ['CLIENT'],
    });

    return { historicalMessages: result.messages, escalatedApprovals: result.escalatedApprovals };
  }, [data?.pages, onApprove, onReject, approvalStatuses]);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['dialog-messages'] });
  }, [queryClient]);

  return {
    historicalMessages,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
    escalatedApprovals,
    reset,
  };
}
