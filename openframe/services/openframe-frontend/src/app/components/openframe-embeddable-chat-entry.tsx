'use client';

/**
 * OpenframeEmbeddableChatEntry — the EmbeddableChat surface for
 * openframe-frontend. Hosted inside AppLayout's in-layout drawer
 * (`AppLayoutDrawer`) rather than as a body-level overlay, so the header
 * and sidebar stay visible and interactive while the chat is open. The
 * drawer owns the shell; this component runs the chat shell-less
 * (`shell="none"`) and is open/close-controlled by the host via the
 * `open` / `onOpenChange` props it shares with the drawer.
 *
 * Because the shell is external:
 *   - no floating "Ask AI" trigger renders (the host provides the trigger),
 *   - no body scroll-lock,
 *   - the X button in the chat's own header still calls `onOpenChange(false)`
 *     to close the host drawer.
 *
 * Configures BOTH modes per Michael's design mandate
 * ([[chat-architecture-and-migration]]):
 *   - `modes.guide` — SSE/Guide. Endpoint URLs come from the runtime
 *     provider, all prefixed with `/guide/` and reverse-proxied to MPH
 *     by the openframe-frontend Next.js layer. The slot can be `{}` —
 *     the SSE adapter reads its config from the ambient runtime, so an
 *     empty options object is enough to flip the mode "on" and make the
 *     in-panel toggle appear.
 *   - `modes.mingo` — NATS/Mingo. All callbacks wired below against the
 *     openframe REST/GraphQL endpoints + the NATS WS URL from
 *     `useNatsAppConfig`.
 *
 * Coexists with the old `/mingo` page route during migration; removal of
 * that route is deferred to a later step.
 *
 * No business logic lives here — everything is callback wiring.
 */

import type { DialogItem, HistoricalMessage, NatsMessageType } from '@flamingo-stack/openframe-frontend-core';
import { EmbeddableChat } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { useNatsAppConfig } from '@/lib/nats/nats-app-config';
import {
  GET_MINGO_DIALOG_QUERY,
  GET_MINGO_DIALOGS_QUERY,
  getMingoDialogMessagesQuery,
} from '../(app)/mingo/queries/dialogs-queries';

// =============================================================================
// Local mirrors of the new lib types that aren't yet in the published
// `@flamingo-stack/openframe-frontend-core` bundle. After the next yalc
// publish bumps the consumer past the dialog-management feature, these
// can be replaced with direct imports from the package.
// =============================================================================

interface FetchDialogsParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

interface FetchDialogsResult {
  dialogs: DialogItem[];
  nextCursor: string | null;
}

interface FetchDialogMessagesParams {
  dialogId: string;
  cursor?: string;
  limit?: number;
}

interface DialogTokenUsageSnapshot {
  chatType?: string;
  inputTokensSize: number;
  outputTokensSize: number;
  totalTokensSize: number;
  contextSize?: number;
}

interface FetchDialogMessagesResult {
  messages: HistoricalMessage[];
  nextCursor: string | null;
  tokenUsage?: DialogTokenUsageSnapshot | null;
}

// =============================================================================
// Wire-format constants — mirror the existing `mingo-api-service.ts` values
// =============================================================================

const AGENT_TYPE = 'ADMIN' as const;
const CHAT_TYPE_ADMIN = 'ADMIN_AI_CHAT' as const;

// =============================================================================
// GraphQL response shapes
// =============================================================================

interface GraphQlDialogEdge {
  cursor?: string;
  node: {
    id: string;
    title?: string;
    status?: string;
    createdAt: string;
    statusUpdatedAt?: string;
  };
}

interface GraphQlPageInfo {
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface GraphQlDialogsResponse {
  data?: {
    dialogs?: {
      edges?: GraphQlDialogEdge[];
      pageInfo?: GraphQlPageInfo;
    };
  };
}

interface GraphQlMessagesResponse {
  data?: {
    messages?: {
      edges?: Array<{ cursor?: string; node: HistoricalMessage & { chatType?: string } }>;
      pageInfo?: GraphQlPageInfo;
    };
  };
}

interface GraphQlDialogResponse {
  data?: {
    dialog?: {
      id: string;
      tokenUsage?: {
        chatType?: string;
        inputTokensSize?: number;
        outputTokensSize?: number;
        totalTokensSize?: number;
        contextSize?: number;
      } | null;
    };
  };
}

// =============================================================================
// Component
// =============================================================================

interface OpenframeEmbeddableChatEntryProps {
  /** Controlled open state, shared with the host `AppLayoutDrawer`. */
  open: boolean;
  /** Change handler, shared with the host `AppLayoutDrawer`. The chat's own
   *  in-header X button calls this with `false` to close the drawer. */
  onOpenChange: (open: boolean) => void;
}

export function OpenframeEmbeddableChatEntry({ open, onOpenChange }: OpenframeEmbeddableChatEntryProps) {
  const { getWsUrl } = useNatsAppConfig();

  const fetchDialogs = useCallback(async (params: FetchDialogsParams): Promise<FetchDialogsResult> => {
    const response = await apiClient.post<GraphQlDialogsResponse>('/chat/graphql', {
      query: GET_MINGO_DIALOGS_QUERY,
      variables: {
        filter: { agentTypes: [AGENT_TYPE] },
        pagination: {
          limit: params.limit ?? 20,
          cursor: params.cursor,
        },
        search: params.search,
      },
    });
    if (!response.ok || !response.data?.data?.dialogs) {
      throw new Error(response.error || 'Failed to fetch Mingo dialogs');
    }
    const edges = response.data.data.dialogs.edges ?? [];
    const pageInfo = response.data.data.dialogs.pageInfo;
    const dialogs: DialogItem[] = edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title || 'Untitled Dialog',
      timestamp: new Date(edge.node.createdAt),
    }));
    return {
      dialogs,
      nextCursor: pageInfo?.hasNextPage ? (pageInfo.endCursor ?? null) : null,
    };
  }, []);

  const fetchDialogMessages = useCallback(
    async (params: FetchDialogMessagesParams): Promise<FetchDialogMessagesResult> => {
      const limit = params.limit ?? 50;
      // First-page calls also fetch the dialog header so we can hydrate
      // `dialogTokenUsage` from the backend snapshot. Paginated calls
      // (cursor set) skip the header — token usage doesn't change with
      // older message pages, the lib keeps the value it already has.
      const messagesPromise = apiClient.post<GraphQlMessagesResponse>('/chat/graphql', {
        query: getMingoDialogMessagesQuery({ includeThinking: false }),
        variables: {
          dialogId: params.dialogId,
          cursor: params.cursor,
          limit,
          sortField: 'createdAt',
          sortDirection: 'DESC',
        },
      });
      const dialogPromise =
        params.cursor === undefined
          ? apiClient.post<GraphQlDialogResponse>('/chat/graphql', {
              query: GET_MINGO_DIALOG_QUERY,
              variables: { id: params.dialogId },
            })
          : Promise.resolve(null);

      const [messagesResp, dialogResp] = await Promise.all([messagesPromise, dialogPromise]);
      if (!messagesResp.ok || !messagesResp.data?.data?.messages) {
        throw new Error(messagesResp.error || 'Failed to fetch Mingo dialog messages');
      }

      const edges = messagesResp.data.data.messages.edges ?? [];
      const pageInfo = messagesResp.data.data.messages.pageInfo;
      // GraphQL pagination sorts DESC (newest first within page) → flip to
      // chronological order before handing off to the lib, which expects
      // oldest-first when processing through `MessageSegmentAccumulator`.
      // Filter on chatType so non-admin messages stay invisible (admin
      // sees a clean Mingo-only thread even when the backend mixes chat
      // types in the same dialog).
      const messages: HistoricalMessage[] = edges
        .map(edge => edge.node)
        .filter(node => !node.chatType || node.chatType === CHAT_TYPE_ADMIN)
        .reverse();

      const tokenUsage =
        dialogResp && dialogResp.ok && dialogResp.data?.data?.dialog?.tokenUsage
          ? {
              chatType: dialogResp.data.data.dialog.tokenUsage.chatType,
              inputTokensSize: dialogResp.data.data.dialog.tokenUsage.inputTokensSize ?? 0,
              outputTokensSize: dialogResp.data.data.dialog.tokenUsage.outputTokensSize ?? 0,
              totalTokensSize: dialogResp.data.data.dialog.tokenUsage.totalTokensSize ?? 0,
              contextSize: dialogResp.data.data.dialog.tokenUsage.contextSize,
            }
          : null;

      return {
        messages,
        nextCursor: pageInfo?.hasNextPage ? (pageInfo.endCursor ?? null) : null,
        tokenUsage,
      };
    },
    [],
  );

  const createDialog = useCallback(async (): Promise<{ dialogId: string }> => {
    const response = await apiClient.post<{ id: string }>('/chat/api/v1/dialogs', {
      agentType: AGENT_TYPE,
    });
    if (!response.ok || !response.data?.id) {
      throw new Error(response.error || 'Failed to create Mingo dialog');
    }
    return { dialogId: response.data.id };
  }, []);

  const publishUserMessage = useCallback(
    async (text: string, options: { hidden?: boolean; dialogId: string | null }): Promise<void> => {
      if (!options.dialogId) return;
      const response = await apiClient.post('/chat/api/v1/messages', {
        dialogId: options.dialogId,
        content: text,
        chatType: CHAT_TYPE_ADMIN,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to send Mingo message');
      }
    },
    [],
  );

  const approveRequest = useCallback(async (requestId: string): Promise<void> => {
    const response = await apiClient.post(`/chat/api/v1/approval-requests/${encodeURIComponent(requestId)}/approve`, {
      approve: true,
    });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to approve Mingo request');
    }
  }, []);

  const rejectRequest = useCallback(async (requestId: string, _reason?: string): Promise<void> => {
    const response = await apiClient.post(`/chat/api/v1/approval-requests/${encodeURIComponent(requestId)}/approve`, {
      approve: false,
    });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to reject Mingo request');
    }
  }, []);

  const stopGeneration = useCallback(async (dialogId: string): Promise<void> => {
    const response = await apiClient.post(`/chat/api/v1/dialogs/${encodeURIComponent(dialogId)}/stop`, {
      chatType: CHAT_TYPE_ADMIN,
    });
    if (!response.ok) {
      throw new Error(response.error || 'Failed to stop Mingo generation');
    }
  }, []);

  const mingoModeConfig = useMemo(
    () => ({
      // `dialogId: null` here is a compat shim for the published
      // `UseNatsChatAdapterConfig` (0.0.215) which still requires the
      // field. The next lib version flips the discriminator from
      // "dialogId presence" to "fetchDialogs presence" — managed-dialog
      // mode kicks in based on `fetchDialogs`, and any host-passed
      // `dialogId` is ignored in that mode. The literal `null` is
      // therefore future-safe: it satisfies the old type and is ignored
      // by the new adapter. Remove once node_modules is past 0.0.215.
      dialogId: null,
      getNatsWsUrl: getWsUrl,
      // ADMIN/Mingo chat agent replies are published on the
      // `chat.{dialogId}.admin-message` NATS subject (matches the legacy
      // /mingo page's `MINGO_JETSTREAM_TOPIC = 'admin-message'`). Without
      // this the adapter tails the default `…​.message` subject, never
      // receives reply chunks, and the assistant bubble hangs forever on
      // "Strutting…". See use-nats-chat-adapter `topics` config.
      topics: ['admin-message'] as NatsMessageType[],
      publishUserMessage,
      fetchDialogs,
      fetchDialogMessages,
      createDialog,
      approveRequest,
      rejectRequest,
      stopGeneration,
      assistantName: 'Mingo',
      chatTypeFilter: CHAT_TYPE_ADMIN,
    }),
    [
      getWsUrl,
      publishUserMessage,
      fetchDialogs,
      fetchDialogMessages,
      createDialog,
      approveRequest,
      rejectRequest,
      stopGeneration,
    ],
  );

  return (
    <EmbeddableChat
      // Shell-less: the host `AppLayoutDrawer` owns the panel chrome,
      // open/close, and positioning. `open` / `onOpenChange` are the same
      // state the drawer is bound to, so the chat's in-header X button and
      // the drawer close in lockstep.
      shell="none"
      open={open}
      onOpenChange={onOpenChange}
      // `modes.guide` is an empty options object — the SSE adapter reads
      // its actual endpoints from the runtime provider (all /guide/*
      // paths reverse-proxied to MPH). The presence of the slot is what
      // makes the in-panel mode toggle render and lets users flip
      // between Guide and Mingo without leaving the panel.
      modes={{ guide: {}, mingo: mingoModeConfig }}
      defaultActiveMode="mingo"
      emptyStateGreeting="Ask Mingo anything about your fleet."
    />
  );
}
