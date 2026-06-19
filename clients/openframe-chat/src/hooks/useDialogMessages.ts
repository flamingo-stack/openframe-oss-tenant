import {
  type ChatApprovalStatus,
  type Message,
  type PendingToolCallData,
  processHistoricalMessages,
} from '@flamingo-stack/openframe-frontend-core';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { dialogGraphQlService } from '../services/dialogGraphQLService';
import { applyToolTitleToMessage } from '../utils/applyToolTitle';
import { useAssistantBranding } from './useAssistantBranding';

interface UseDialogMessagesOptions {
  enabled?: boolean;
  onApprove?: (requestId?: string) => Promise<void> | void;
  onReject?: (requestId?: string) => Promise<void> | void;
  approvalStatuses?: Record<string, ChatApprovalStatus>;
}

export function useDialogMessages(dialogId: string | null, options: UseDialogMessagesOptions = {}) {
  const queryClient = useQueryClient();
  const { flags } = useFeatureFlags();
  const { assistantName, assistantAvatar } = useAssistantBranding();
  const { onApprove, onReject, approvalStatuses } = options;

  const { data, hasNextPage, isFetchingNextPage, isLoading, isFetched, fetchNextPage, dataUpdatedAt } = useInfiniteQuery({
    queryKey: ['dialog-messages', dialogId],
    queryFn: async ({ pageParam }) => {
      const connection = await dialogGraphQlService.getDialogMessagesPage(dialogId!, pageParam, 50);
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

  const initialOptStartSeq = useMemo(() => {
    let max = 0;
    if (!data?.pages) return max;
    for (const page of data.pages) {
      for (const edge of page.edges) {
        const seq = edge.node.lastChunkStreamSeq;
        if (typeof seq === 'number' && seq > max) max = seq;
      }
    }
    return max;
  }, [data?.pages]);

  // Raw persisted (Mongo) ids across all fetched pages — passed to
  // mergeHistoryWithRealtime so synthetics that have been adopted under a
  // persisted id are deduped too.
  const rawHistoryIds = useMemo(() => {
    const idSet = new Set<string>();
    if (!data?.pages) return idSet;
    for (const page of data.pages) {
      for (const edge of page.edges) idSet.add(edge.node.id);
    }
    return idSet;
  }, [data?.pages]);

  const { historicalMessages, escalatedApprovals } = useMemo(() => {
    if (!data?.pages) {
      return {
        historicalMessages: [] as Message[],
        escalatedApprovals: new Map() as Map<
          string,
          { command: string; explanation?: string; approvalType: string; toolCalls?: PendingToolCallData[] }
        >,
      };
    }

    const allNodes = [];
    const reversedPages = [...data.pages].reverse();
    for (const page of reversedPages) {
      const reversedEdges = [...page.edges].reverse();
      for (const edge of reversedEdges) {
        allNodes.push(applyToolTitleToMessage(edge.node));
      }
    }

    const result = processHistoricalMessages(allNodes, {
      onApprove,
      onReject,
      approvalStatuses,
      assistantName: assistantName ?? 'Fae',
      assistantAvatar,
      displayApprovalTypes: ['CLIENT'],
      batchApprovalsEnabled: flags['batch-approval'],
    });

    return { historicalMessages: result.messages, escalatedApprovals: result.escalatedApprovals };
  }, [data?.pages, onApprove, onReject, approvalStatuses, flags, assistantName, assistantAvatar]);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['dialog-messages'] });
  }, [queryClient]);

  return {
    historicalMessages,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
    isFetched,
    fetchNextPage,
    escalatedApprovals,
    initialOptStartSeq,
    rawHistoryIds,
    dataUpdatedAt,
    reset,
  };
}
