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
  /** Resolver display names per requestId (live APPROVAL_RESULT) — overlaid
   *  onto approval segments in historical bubbles so the status pill reads
   *  "Approved by {name}" without waiting for a refetch. */
  resolvedByNames?: Record<string, string>;
}

export function useDialogMessages(dialogId: string | null, options: UseDialogMessagesOptions = {}) {
  const queryClient = useQueryClient();
  const { flags } = useFeatureFlags();
  const { assistantName, assistantAvatar } = useAssistantBranding();
  const { onApprove, onReject, approvalStatuses, resolvedByNames } = options;

  const { data, hasNextPage, isFetchingNextPage, isLoading, isFetched, fetchNextPage, dataUpdatedAt } =
    useInfiniteQuery({
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

  // Model provenance of the newest assistant message across fetched pages
  // (pages and rows are newest-first). Seeds the footer model display on
  // dialog resume — per-chat truth, replacing the removed tenant-wide
  // /chat/api/v1/ai-configuration read.
  const latestAssistantModel = useMemo(() => {
    if (!data?.pages) return null;
    for (const page of data.pages) {
      for (const edge of page.edges) {
        const owner = edge.node.owner as
          | { type?: string; model?: string; providerName?: string | null; contextWindow?: number | null }
          | undefined;
        if (owner?.type === 'ASSISTANT' && owner.model && owner.providerName) {
          return { modelName: owner.model, provider: owner.providerName, contextWindow: owner.contextWindow ?? 0 };
        }
      }
    }
    return null;
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

    // Overlay resolver names from live APPROVAL_RESULT chunks: the
    // approvalStatuses overlay above only carries the status, so a card
    // resolved mid-session in a historical bubble would render a nameless
    // pill until the next refetch.
    const names = resolvedByNames ?? {};
    const messagesWithNames =
      Object.keys(names).length === 0
        ? result.messages
        : result.messages.map(msg => {
            if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;
            let changed = false;
            const content = msg.content.map(segment => {
              if (segment.type === 'approval_request') {
                const name = segment.data?.requestId ? names[segment.data.requestId] : undefined;
                if (name && !segment.resolvedByName) {
                  changed = true;
                  return { ...segment, resolvedByName: name };
                }
              } else if (segment.type === 'approval_batch') {
                const name = names[segment.data.approvalRequestId];
                if (name && !segment.resolvedByName) {
                  changed = true;
                  return { ...segment, resolvedByName: name };
                }
              }
              return segment;
            });
            return changed ? { ...msg, content } : msg;
          });

    return { historicalMessages: messagesWithNames, escalatedApprovals: result.escalatedApprovals };
  }, [data?.pages, onApprove, onReject, approvalStatuses, resolvedByNames, flags, assistantName, assistantAvatar]);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['dialog-messages'] });
  }, [queryClient]);

  return {
    historicalMessages,
    latestAssistantModel,
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
