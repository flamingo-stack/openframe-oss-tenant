'use client';

/**
 * useMingoUnifiedChatState — adapts the existing `/mingo` data stack
 * (react-query + the `mingo-messages-store` Zustand store + the NATS/JetStream
 * realtime subscription) into the lib's `UnifiedChatState` shape so it can be
 * injected straight into `<EmbeddableChat mingoState={…}>`.
 *
 * Why this exists: the EmbeddableChat drawer previously drove the lib's
 * built-in `useNatsChatAdapter`, which owns dialog/message/streaming state in
 * local React state — so it was lost on every panel unmount, forcing the
 * `keepMounted` workaround. The `/mingo` page already solved persistence the
 * right way: its data lives OUTSIDE the component (react-query cache + the
 * global Zustand store), so it survives unmount for free. This hook reuses
 * those exact sub-hooks (no reinvention) and maps their output onto the
 * unified contract; the panel can now unmount on close and rehydrate instantly
 * on reopen, with realtime caught up via JetStream replay — no `keepMounted`.
 *
 * It does NOT touch the `/mingo` page: it composes the same building blocks
 * (`useMingoDialogs`, `useMingoDialogSelection`, `useMingoChat`,
 * `useMingoRealtimeSubscription`, `useMingoMessagesStore`) independently.
 *
 * Realtime is a rendered component (`<DialogSubscription>`), not a hook, so
 * this returns a `subscription` bundle the host renders alongside the chat.
 */

import type {
  ChatConnectionState,
  DialogItem,
  DialogTokenUsage,
  StreamingPhase,
  UnifiedChatMessage,
  UnifiedChatState,
  UnifiedSendMessageOptions,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAiModelStatus } from '@/app/hooks/use-ai-model';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { featureFlags } from '@/lib/feature-flags';
import { CONTEXT_ITEMS_MAX, RECENT_VIEWS_MAX } from '../context/context-types';
import { useMingoContextStore } from '../stores/mingo-context-store';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import { type MingoSendContext, useMingoChat } from './use-mingo-chat';
import { useMingoDialogActions } from './use-mingo-dialog-actions';
import { useMingoDialogSelection } from './use-mingo-dialog-selection';
import { useMingoDialogs } from './use-mingo-dialogs';
import { useMingoRealtimeSubscription } from './use-mingo-realtime-subscription';

const ADMIN_CHAT_TYPE = 'ADMIN_AI_CHAT' as const;
const WELCOME_TEXT = "Hi! I'm Mingo AI, ready to help with your technical tasks. What can I do for you?";

/** Metadata frame shape emitted by `<DialogSubscription onMetadata>`. */
interface MetadataFrame {
  modelDisplayName: string;
  modelName: string;
  providerName: string;
  contextWindow: number;
}

/** Props the host needs to render `<DialogSubscription>` for the active dialog. */
export interface MingoSubscriptionBindings {
  activeDialogId: string | null;
  /** True once the active dialog has been subscribed — gates rendering. */
  isSubscribed: boolean;
  onApprove: (requestId?: string) => void | Promise<void>;
  onReject: (requestId?: string) => void | Promise<void>;
  approvalStatuses: Record<string, string>;
  onConnectionChange: (dialogId: string, connected: boolean) => void;
  onMetadata: (metadata: MetadataFrame) => void;
  initialOptStartSeq: number;
  isInitialOptStartSeqReady: boolean;
}

export interface MingoUnifiedChat {
  state: UnifiedChatState;
  subscription: MingoSubscriptionBindings;
  /**
   * Create a brand-new dialog and send `text` into it, regardless of any
   * currently-active dialog. Used by external launchers (e.g. the "Ask Mingo
   * about X" EmptyState buttons) that always want a fresh conversation.
   */
  sendInNewDialog: (text: string) => Promise<void>;
  /** Current server-side dialog-search term. */
  searchQuery: string;
  /** Set the dialog-search term (already debounced by the chat's search bar). */
  setSearchQuery: (query: string) => void;
  /** Fetch a page of ARCHIVED dialogs — feeds the chat archive page. */
  fetchArchivedDialogs: (params: { cursor?: string; limit?: number; search?: string }) => Promise<{
    dialogs: DialogItem[];
    nextCursor: string | null;
  }>;
  /** Restore an archived dialog back to the active list. */
  unarchiveDialog: (id: string) => Promise<void>;
}

export function useMingoUnifiedChatState(): MingoUnifiedChat {
  const { aiModel } = useAiModelStatus();

  const { activeDialogId, setActiveDialogId, resetUnread, addMessage, getStreamingMessage, tokenUsageByDialog } =
    useMingoMessagesStore();

  // Server-side dialog search. The embeddable chat's search bar emits the
  // already-debounced term via `setSearchQuery`; it rides the `useMingoDialogs`
  // query key, so the backend filters the list.
  const [searchQuery, setSearchQuery] = useState('');

  const {
    dialogs,
    isLoading: isLoadingDialogs,
    hasNextPage: hasMoreDialogs,
    fetchNextPage: fetchNextDialogPage,
    refetch: refetchDialogs,
  } = useMingoDialogs({ search: searchQuery || undefined });

  const { renameDialog, archiveDialog, unarchiveDialog, fetchArchivedDialogs } = useMingoDialogActions();

  const {
    selectDialog: selectDialogMut,
    isLoadingDialog,
    isLoadingMessages,
    handleApprove,
    handleReject,
    approvalStatuses,
    dialogData,
    hasNextPage: hasMoreMessages,
    fetchNextPage: fetchNextMessagePage,
    initialOptStartSeq,
    isMessagesFetched,
  } = useMingoDialogSelection();

  const {
    messages: processedMessages,
    createDialog,
    sendMessage: sendMingoMessage,
    stopGeneration,
    isTyping,
    isCompacting,
  } = useMingoChat(activeDialogId);

  const { subscribeToDialog, subscribedDialogs, onConnectionChange, connectionState } =
    useMingoRealtimeSubscription(activeDialogId);

  // ─── Live model metadata (refined per-turn by `metadata` frames) ──────────
  const [liveModel, setLiveModel] = useState<{ displayName: string; provider: string } | null>(null);
  const onMetadata = useCallback((meta: MetadataFrame) => {
    setLiveModel({ displayName: meta.modelDisplayName, provider: meta.providerName });
  }, []);
  const model = liveModel ?? (aiModel ? { displayName: aiModel.displayName, provider: aiModel.provider } : null);

  // ─── Token usage: store (kept live by realtime) first, dialog query fallback ─
  const tokenUsage = useMemo<DialogTokenUsage | null>(() => {
    if (!activeDialogId) return null;
    const cached = tokenUsageByDialog.get(activeDialogId);
    if (cached) {
      return {
        chatType: ADMIN_CHAT_TYPE,
        inputTokensSize: cached.inputTokensSize ?? 0,
        outputTokensSize: cached.outputTokensSize ?? 0,
        totalTokensSize: cached.totalTokensSize ?? 0,
        contextSize: cached.contextSize ?? 0,
      };
    }
    const u = dialogData?.tokenUsage?.find(t => t.chatType === ADMIN_CHAT_TYPE);
    if (!u) return null;
    return {
      chatType: ADMIN_CHAT_TYPE,
      inputTokensSize: u.inputTokensSize ?? 0,
      outputTokensSize: u.outputTokensSize ?? 0,
      totalTokensSize: u.totalTokensSize ?? 0,
      contextSize: u.contextSize ?? 0,
    };
  }, [activeDialogId, tokenUsageByDialog, dialogData?.tokenUsage]);

  // ─── Messages: ProcessedMessage[] → UnifiedChatMessage[] ──────────────────
  // The lib re-derives assistantType itself and folds 'error' into the
  // assistant bubble (same as the /mingo list). For USER bubbles we surface the
  // real sender identity — the admin's name (GraphQL `owner.user` / optimistic
  // auth-store), avatar, and `authorType` — so the embeddable chat matches the
  // standalone /mingo page: the sender shows up as the admin (accent name color)
  // instead of the hardcoded "You". Assistant rows keep the lib's Mingo defaults
  // (brand icon + "Mingo"), and a missing/Unknown name degrades to the lib's
  // "You" fallback.
  // `processedMessages` hands back referentially-stable objects for unchanged
  // messages (see useMingoChat's reconciliation), so keying a WeakMap by the
  // source object yields a stable UnifiedChatMessage too — the lib's reference-
  // equality memo then re-renders only the streaming bubble, not the whole list
  // (which would otherwise collapse open menus/cards on every chunk).
  const unifiedCacheRef = useRef(new WeakMap<object, UnifiedChatMessage>());
  const messages = useMemo<UnifiedChatMessage[]>(() => {
    const cache = unifiedCacheRef.current;
    return processedMessages.map(m => {
      const cached = cache.get(m);
      if (cached) return cached;

      const role: 'user' | 'assistant' = m.role === 'user' ? 'user' : 'assistant';
      const identity =
        role === 'user'
          ? {
              name: m.name && m.name !== 'Unknown' ? m.name : undefined,
              avatar: m.avatar ?? null,
              authorType: m.authorType,
            }
          : {};
      // Forward the real message timestamp so the lib renders the actual
      // send time AND its memoized message keeps a stable `getTime()` across
      // realtime chunks (a missing/`new Date()` timestamp would re-render the
      // whole list and collapse open menus on every chunk).
      // Forward attached entity-context items on user messages so the lib
      // renders the read-only chip strip under the bubble (Figma 1:6437). They
      // ride the optimistic message (full `ChatContextItem` with labels) and the
      // realtime `MESSAGE_REQUEST` echo; the lib resolves each chip's icon from
      // `contextPicker.entityTypes` by `type`.
      const context = role === 'user' && m.contextItems?.length ? { contextItems: m.contextItems } : {};
      const unified: UnifiedChatMessage = Array.isArray(m.content)
        ? { id: m.id, role, content: '', segments: m.content, timestamp: m.timestamp, ...identity, ...context }
        : { id: m.id, role, content: m.content, timestamp: m.timestamp, ...identity, ...context };
      cache.set(m, unified);
      return unified;
    });
  }, [processedMessages]);

  // ─── Streaming phase: idle → thinking → streaming ─────────────────────────
  const streamingPhase = useMemo<StreamingPhase>(() => {
    if (!isTyping && !isCompacting) return 'idle';
    if (!activeDialogId) return 'thinking';
    const streaming = getStreamingMessage(activeDialogId);
    const hasContent = !!streaming && Array.isArray(streaming.content) && streaming.content.length > 0;
    return hasContent ? 'streaming' : 'thinking';
  }, [isTyping, isCompacting, activeDialogId, getStreamingMessage]);

  // ─── Dialog selection (mirrors the /mingo page glue, minus URL syncing) ───
  const selectDialog = useCallback(
    (id: string | null) => {
      if (id === null) {
        setActiveDialogId(null);
        return;
      }
      if (id === activeDialogId) return;
      setActiveDialogId(id);
      resetUnread(id);
      subscribeToDialog(id);
      selectDialogMut(id);
    },
    [activeDialogId, setActiveDialogId, resetUnread, subscribeToDialog, selectDialogMut],
  );

  // ─── Create a fresh dialog and send into it (always-new) ──────────────────
  // Shared by the draft branch of `sendMessage` and external launchers that
  // want a brand-new conversation regardless of what's currently active.
  const sendInNewDialog = useCallback(
    async (text: string, context?: MingoSendContext) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newId = await createDialog();
      if (!newId) return;
      addMessage(newId, {
        id: `welcome-${newId}`,
        role: 'assistant',
        name: 'Mingo',
        timestamp: new Date(),
        content: WELCOME_TEXT,
        assistantType: 'mingo',
      });
      setActiveDialogId(newId);
      resetUnread(newId);
      subscribeToDialog(newId);
      selectDialogMut(newId);
      // Mirror the standalone /mingo page: a successful send is a tracked
      // dashboard-activity event (relayed to HubSpot by the backend). This
      // covers every new-dialog send — draft composer, launcher prompts, and
      // quick-action chips — so the embeddable chat matches the page 1:1.
      const sent = await sendMingoMessage(trimmed, newId, context);
      if (sent) trackDashboardActivity(EVENT_SUBTYPE.SEND_MINGO_MESSAGE);
    },
    [createDialog, addMessage, setActiveDialogId, resetUnread, subscribeToDialog, selectDialogMut, sendMingoMessage],
  );

  // Snapshot the live navigation context (open view + recent views) from the
  // store and fold in the picker selection from the lib's send options. Read
  // imperatively (`getState`) so `sendMessage` doesn't re-create on every
  // navigation — it only needs the value at send time.
  const buildSendContext = useCallback((options?: UnifiedSendMessageOptions): MingoSendContext => {
    // The entire entity-context feature is gated behind `mingo-sidebar-context`.
    // When off, send NO context at all — not the picker selection, and not the
    // background navigation context (`openView` / `recentViews`). The store keeps
    // tracking views (harmless); it just never rides out on the message.
    if (!featureFlags.mingoSidebarContext.enabled()) {
      return { contextItems: undefined, openView: undefined, recentViews: [] };
    }
    const { openView, recentViews } = useMingoContextStore.getState();
    return {
      // Defense-in-depth: hard-cap at the backend's contextItems limit (10) so a
      // selection that slipped past the picker's `atLimit` (e.g. the @-mention
      // path) can't 400 the whole message.
      contextItems: options?.contextItems?.slice(0, CONTEXT_ITEMS_MAX),
      openView: openView ? { type: openView.type, id: openView.id } : undefined,
      // Defense-in-depth: hard-cap at the backend's recentViews limit (5),
      // mirroring the contextItems cap above — a corrupted persisted store blob
      // with >5 entries must not 400 the whole message.
      recentViews: recentViews.slice(0, RECENT_VIEWS_MAX).map(r => ({ type: r.type, id: r.id })),
    };
  }, []);

  // ─── Send: create-on-first-send when no dialog is active (draft) ──────────
  // `options.contextItems` carries the composer's picker selection; the open
  // view + recent views come from the navigation store via `buildSendContext`.
  const sendMessage = useCallback(
    async (text: string, options?: UnifiedSendMessageOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const context = buildSendContext(options);

      if (!activeDialogId) {
        // The draft branch delegates to `sendInNewDialog`, which already fires
        // SEND_MINGO_MESSAGE on success — don't double-track here.
        await sendInNewDialog(trimmed, context);
        return;
      }

      // Existing-dialog send: track on success, same as the /mingo page's
      // active-dialog branch.
      const sent = await sendMingoMessage(trimmed, undefined, context);
      if (sent) trackDashboardActivity(EVENT_SUBTYPE.SEND_MINGO_MESSAGE);
    },
    [activeDialogId, sendInNewDialog, sendMingoMessage, buildSendContext],
  );

  const stopMessage = useCallback(() => {
    void stopGeneration();
  }, [stopGeneration]);

  // The store persists messages across switches for fast reopen — clearing the
  // open conversation just drops the selection back to the draft/list state.
  const clearMessages = useCallback(() => {
    setActiveDialogId(null);
  }, [setActiveDialogId]);

  const startNewDialog = useCallback(async (): Promise<string | null> => {
    setActiveDialogId(null);
    return null;
  }, [setActiveDialogId]);

  const loadMoreDialogs = useCallback(async () => {
    await fetchNextDialogPage();
  }, [fetchNextDialogPage]);

  const loadMoreMessages = useCallback(async () => {
    await fetchNextMessagePage();
  }, [fetchNextMessagePage]);

  const approveRequest = useCallback(
    async (requestId: string) => {
      await handleApprove(requestId);
    },
    [handleApprove],
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      await handleReject(requestId);
    },
    [handleReject],
  );

  const noopDialogAction = useCallback(async () => {}, []);
  const reloadDialogs = useCallback(() => {
    void refetchDialogs();
  }, [refetchDialogs]);
  const discussRef = useCallback(() => {}, []);
  const displayRef = useCallback(() => {}, []);

  const state = useMemo<UnifiedChatState>(
    () => ({
      messages,
      isLoading: isTyping || isCompacting,
      streamingPhase,
      sendMessage,
      stopMessage,
      clearMessages,
      discussRef,
      displayRef,
      // Per-turn LLM telemetry — Mingo surfaces cumulative dialog usage via the
      // `current*` fields so the composer's token tail matches the /mingo page
      // (usedTokens = totalTokensSize, contextWindow = contextSize).
      currentProvider: model?.provider ?? null,
      currentModelLabel: model?.displayName ?? null,
      currentContextWindowMaxTokens: tokenUsage?.contextSize ?? null,
      currentInputTokens: tokenUsage?.totalTokensSize ?? null,
      currentOutputTokens: null,
      currentCacheHitRatePct: null,
      currentUsageBreakdown: null,
      // Dialog management
      dialogs: dialogs as DialogItem[],
      activeDialogId,
      selectDialog,
      startNewDialog,
      deleteDialog: noopDialogAction,
      renameDialog,
      archiveDialog,
      isDialogsLoading: isLoadingDialogs,
      dialogsError: false,
      reloadDialogs,
      isMessagesLoading: isLoadingMessages || isLoadingDialog,
      hasMoreDialogs: hasMoreDialogs ?? false,
      loadMoreDialogs,
      hasMoreMessages: hasMoreMessages ?? false,
      loadMoreMessages,
      approveRequest,
      rejectRequest,
      dialogTokenUsage: tokenUsage,
      connectionState: connectionState as ChatConnectionState,
    }),
    [
      messages,
      isTyping,
      isCompacting,
      streamingPhase,
      sendMessage,
      stopMessage,
      clearMessages,
      discussRef,
      displayRef,
      model,
      tokenUsage,
      dialogs,
      activeDialogId,
      selectDialog,
      startNewDialog,
      noopDialogAction,
      renameDialog,
      archiveDialog,
      isLoadingDialogs,
      reloadDialogs,
      isLoadingMessages,
      isLoadingDialog,
      hasMoreDialogs,
      loadMoreDialogs,
      hasMoreMessages,
      loadMoreMessages,
      approveRequest,
      rejectRequest,
      connectionState,
    ],
  );

  const subscription = useMemo<MingoSubscriptionBindings>(
    () => ({
      activeDialogId,
      isSubscribed: !!activeDialogId && subscribedDialogs.has(activeDialogId),
      onApprove: handleApprove,
      onReject: handleReject,
      approvalStatuses,
      onConnectionChange,
      onMetadata,
      initialOptStartSeq,
      isInitialOptStartSeqReady: isMessagesFetched,
    }),
    [
      activeDialogId,
      subscribedDialogs,
      handleApprove,
      handleReject,
      approvalStatuses,
      onConnectionChange,
      onMetadata,
      initialOptStartSeq,
      isMessagesFetched,
    ],
  );

  return {
    state,
    subscription,
    sendInNewDialog,
    searchQuery,
    setSearchQuery,
    fetchArchivedDialogs,
    unarchiveDialog,
  };
}
