import {
  type ChatApprovalStatus,
  type ChunkData,
  extractIncompleteMessageState,
  type Message,
  type MessageSegment,
  mergeHistoryWithRealtime,
  type PendingToolCallData,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  type ToolExecutionSegment,
  useJetStreamDialogSubscription,
} from '@flamingo-stack/openframe-frontend-core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebugMode } from '../contexts/DebugModeContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { ChatApiService } from '../services/chatApiService';
import { dialogGraphQlService } from '../services/dialogGraphQLService';
import { useTauriBridgeLiveness, useTauriDialogSubscription } from '../services/natsTauri';
import { tokenService } from '../services/tokenService';
import { overrideToolTitle } from '../utils/applyToolTitle';
import { log } from '../utils/log';
import { isTauri } from '../utils/runtime';
import { useAssistantBranding } from './useAssistantBranding';
import { useChatApprovals } from './useChatApprovals';
import { useChatConfig } from './useChatConfig';
import { useChatEscalation } from './useChatEscalation';
import { useChatMessages } from './useChatMessages';
import { CHAT_NATS_CLIENT_CONFIG, useChatNatsConfig } from './useChatNatsConfig';
import { useDialogMessages } from './useDialogMessages';
import { useRealtimeChunkProcessor } from './useRealtimeChunkProcessor';

const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';

// Rejection sentinel for a deliberately-cancelled subscription wait (view
// switch); the send flow treats it as a silent stop, not an error.
const SUBSCRIPTION_WAIT_CANCELLED = 'Subscription wait cancelled';

// Scan messages newest-to-oldest for the most recent UNRESOLVED gate, where
// `pickId` decides which segment kinds count and where their id lives. Used by
// sendMessage to optimistically settle the active gate when the user
// interrupts with a new message. Approvals and escalation offers are scanned
// SEPARATELY on purpose: a thread can hold one of each, and both must settle.
function findLatestPendingId(msgs: Message[], pickId: (seg: MessageSegment) => string | undefined): string | undefined {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (!Array.isArray(msg.content)) continue;
    for (let j = msg.content.length - 1; j >= 0; j--) {
      const id = pickId(msg.content[j]);
      if (id) return id;
    }
  }
  return undefined;
}

const isUnresolved = (status?: string): boolean => !status || status === 'pending';

const pickApprovalId = (seg: MessageSegment): string | undefined => {
  if (seg.type === 'approval_request' && isUnresolved(seg.status)) return seg.data?.requestId;
  if (seg.type === 'approval_batch' && isUnresolved(seg.status)) return seg.data?.approvalRequestId;
  return undefined;
};

/** An escalation offer is SUPERSEDED by a new message, not rejected. */
const pickOfferId = (seg: MessageSegment): string | undefined =>
  seg.type === 'escalation_offer' && isUnresolved(seg.status) ? seg.data?.offerId : undefined;

interface UseChatOptions {
  useApi?: boolean;
  apiToken?: string;
  apiBaseUrl?: string;
  useNats?: boolean;
  onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void;
  onTokenUsage?: (data: TokenUsageData) => void;
  onDialogClosed?: () => void;
  onDirectModeDetected?: () => void;
  /** The client approved a handoff — the ticket is now with a technician. */
  onEscalated?: () => void;
  /** An escalation approve/decline failed after its optimistic flip was rolled back. */
  onEscalationError?: (message: string) => void;
}

export function useChat({
  useApi = true,
  useNats = false,
  onMetadataUpdate,
  onTokenUsage,
  onDialogClosed,
  onDirectModeDetected,
  onEscalated,
  onEscalationError,
}: UseChatOptions = {}) {
  const { flags } = useFeatureFlags();

  // Core state
  const [isTyping, setIsTyping] = useState(false);
  const [natsStreaming, setNatsStreaming] = useState(false);
  const [natsDialogId, setNatsDialogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResumedDialog, setIsResumedDialog] = useState(false);
  // Dialog that was open across a NATS reconnect. History normally loads only
  // for RESUMED dialogs (`enabled: isResumedDialog`), so a dialog created this
  // session had no enabled query to refetch — an outage longer than the
  // JetStream retention (~10 min) left a permanent hole. Scoped to the id
  // rather than a sticky flag: a dialog created AFTER the reconnect has nothing
  // to back-fill, and enabling its query only fires a first fetch whose pending
  // state blanks the thread with a skeleton.
  const [backfillDialogId, setBackfillDialogId] = useState<string | null>(null);
  const [isTicketPreview, setIsTicketPreview] = useState(false);
  const { getWsUrl, onBeforeReconnect } = useChatNatsConfig();

  // Refs for stream management
  const natsDoneResolverRef = useRef<null | (() => void)>(null);
  const subscriptionPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const escalatedApprovalsRef = useRef<
    Map<string, { command: string; explanation?: string; approvalType: string; toolCalls?: PendingToolCallData[] }>
  >(new Map());

  const { debugMode } = useDebugMode();
  const { quickActions, isSettingsLoading } = useChatConfig();
  const { assistantName, assistantAvatar } = useAssistantBranding();

  const apiServiceRef = useRef<ChatApiService | null>(null);
  if (!apiServiceRef.current) {
    apiServiceRef.current = new ChatApiService(debugMode);
    if (useApi) {
      Promise.all([tokenService.requestToken().catch(() => null), tokenService.initApiUrl().catch(() => null)]).catch(
        () => null,
      );
    }
  }

  useEffect(() => {
    apiServiceRef.current?.setDebugMode(debugMode);
  }, [debugMode]);

  const approvals = useChatApprovals();

  // Escalation is ticket-keyed while a chat started this session knows only
  // its dialog, so resolve the 1:1 link once per dialog. Also feeds the host's
  // ticket-state query, which is what flips the composer to "waiting for
  // technician" without waiting on its poll.
  // Gated on the flag because `Dialog.ticketId` ships with the escalation
  // backend; querying it against a tenant without that build is a guaranteed
  // validation error.
  const escalationEnabled = flags['ai-escalation'];
  // Keyed by dialog, so switching dialogs drops the previous ticket rather than
  // aiming escalation at it while the new one resolves.
  const { data: dialogTicketId = null } = useQuery({
    queryKey: ['dialog-ticket-id', natsDialogId],
    queryFn: ({ queryKey: [, id] }) => dialogGraphQlService.getDialogTicketId(id as string),
    enabled: !!natsDialogId && escalationEnabled,
    // Finite on purpose: the link is immutable, but an infinite stale time plus
    // no invalidation site would make three exhausted retries disable
    // escalation for the rest of the dialog's life.
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const escalation = useChatEscalation({ ticketId: dialogTicketId, onEscalated });

  // Read late: `resolveOfferLocally` is created once, so it cannot close over
  // the render's callback.
  const onEscalationErrorRef = useRef(onEscalationError);
  onEscalationErrorRef.current = onEscalationError;

  // Optimistic flip BEFORE the mutation, for the same reason command
  // approvals do it: the card must resolve on the click. `escalationOfferStates`
  // alone only reaches historical bubbles — a card in the live thread needs
  // the message-store updater too. Stable identity (refs) so the accumulator
  // that stamps these onto segments is created once.
  const resolveOfferLocally = useRef(async (offerId: string | undefined, approve: boolean) => {
    if (!offerId) return;
    messagesRef.current.updateApprovalStatusById(offerId, approve ? 'approved' : 'rejected');
    try {
      await escalationRef.current.resolveOffer(offerId, approve);
    } catch (error) {
      messagesRef.current.updateApprovalStatusById(offerId, 'pending');
      onEscalationErrorRef.current?.(error instanceof Error ? error.message : 'Please try again shortly.');
    }
  }).current;

  const handleEscalationApprove = useCallback(
    (offerId?: string) => resolveOfferLocally(offerId, true),
    [resolveOfferLocally],
  );
  const handleEscalationReject = useCallback(
    (offerId?: string) => resolveOfferLocally(offerId, false),
    [resolveOfferLocally],
  );

  const messages = useChatMessages({
    onApprove: approvals.handleApproveRequest,
    onReject: approvals.handleRejectRequest,
    onEscalationApprove: handleEscalationApprove,
    onEscalationReject: handleEscalationReject,
  });

  const {
    historicalMessages,
    latestAssistantModel: historyAssistantModel,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistoricalMessages,
    isFetched: isHistoryFetched,
    initialOptStartSeq,
    rawHistoryIds,
    dataUpdatedAt: historyFetchedAt,
    fetchNextPage,
    escalatedApprovals,
    reset: resetDialogMessages,
  } = useDialogMessages(natsDialogId, {
    enabled: isResumedDialog || (!!natsDialogId && natsDialogId === backfillDialogId),
    onApprove: approvals.handleApproveRequest,
    onReject: approvals.handleRejectRequest,
    approvalStatuses: approvals.approvalStatuses,
    resolvedByNames: approvals.resolvedByNames,
    escalationOfferStates: escalation.escalationOfferStates,
    onEscalationApprove: handleEscalationApprove,
    onEscalationReject: handleEscalationReject,
  });

  useEffect(() => {
    if (escalatedApprovals.size > 0) {
      escalatedApprovalsRef.current = escalatedApprovals;
    }
  }, [escalatedApprovals]);

  // Id of the in-flight streaming synthetic (the trailing assistant bubble
  // while a stream is live). Exempted from the merge's dedup so a still-growing
  // turn is never trimmed against history that doesn't contain it yet.
  const streamingMessageId = useMemo(() => {
    if (!natsStreaming) return null;
    const last = messages.messages[messages.messages.length - 1];
    return last?.role === 'assistant' ? last.id : null;
  }, [natsStreaming, messages.messages]);

  // Reconcile persisted history with realtime synthetics via the shared lib
  // merge instead of a hand-rolled positional cut.
  // Per-message `streamSeq` lets it drop a synthetic once history has
  // persisted past it, while keeping any not-yet-persisted (or in-flight) turn.
  const allMessages = useMemo(
    () =>
      mergeHistoryWithRealtime<Message>({
        processedHistory: historicalMessages,
        existingMessages: messages.messages,
        streamingMessageId,
        historyFetchedAt,
        historyMaxStreamSeq: initialOptStartSeq,
        rawHistoryIds,
      }),
    [historicalMessages, messages.messages, streamingMessageId, historyFetchedAt, initialOptStartSeq, rawHistoryIds],
  );

  const hasPendingEscalationOffer = useMemo(() => !!findLatestPendingId(allMessages, pickOfferId), [allMessages]);

  const messagesRef = useRef(messages);
  const approvalsRef = useRef(approvals);
  const escalationRef = useRef(escalation);
  const allMessagesRef = useRef(allMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    approvalsRef.current = approvals;
  }, [approvals]);

  useEffect(() => {
    escalationRef.current = escalation;
  }, [escalation]);

  useEffect(() => {
    allMessagesRef.current = allMessages;
  }, [allMessages]);

  const realtimeCallbacks = useMemo(
    () => ({
      onStreamStart: () => {
        log.info('nats:chat', 'stream started');
        setNatsStreaming(true);
        setIsTyping(true);
        messagesRef.current.resetCurrentMessageSegments();
        messagesRef.current.ensureAssistantMessage();
      },
      onStreamEnd: () => {
        log.info('nats:chat', 'stream ended');
        setNatsStreaming(false);
        setIsTyping(false);
        const resolve = natsDoneResolverRef.current;
        natsDoneResolverRef.current = null;
        if (resolve) resolve();
      },
      onMetadata: onMetadataUpdate,
      onTokenUsage,
      onSegmentsUpdate: (segments: MessageSegment[], metadata?: SegmentsUpdateMetadata) => {
        if (metadata?.isCompacting) {
          setNatsStreaming(false);
          setIsTyping(false);
        } else {
          setNatsStreaming(true);
        }
        if (metadata?.append) {
          messagesRef.current.appendSegmentsToLastAssistant(segments, metadata?.streamSeq);
        } else {
          messagesRef.current.ensureAssistantMessage();
          messagesRef.current.updateSegments(segments, metadata?.streamSeq);
        }
      },
      // EXECUTING_TOOL / approved APPROVAL_RESULT chunks land OUTSIDE the
      // message_start/end window (approved commands run between the approval
      // bubble and the continuation stream) — without this the composer
      // unlocks and the typing indicator drops while commands execute.
      // Cleared by the continuation's onStreamEnd / onError / Stop. A
      // replayed dead tail (tool started, then a crash — no continuation
      // ever emitted) can re-assert the lock on a resumed dialog, but
      // natsStreaming keeps the Stop button available as the escape hatch.
      onAgentBusy: () => {
        setNatsStreaming(true);
        setIsTyping(true);
      },
      onError: (_errorText: string) => {
        setNatsStreaming(false);
        setIsTyping(false);
        const resolve = natsDoneResolverRef.current;
        natsDoneResolverRef.current = null;
        if (resolve) resolve();
      },
      onApprove: (requestId?: string) => approvalsRef.current.handleApproveRequest(requestId),
      onReject: (requestId?: string) => approvalsRef.current.handleRejectRequest(requestId),
      onEscalationApprove: handleEscalationApprove,
      onEscalationReject: handleEscalationReject,
      // Same two-container problem as `onApprovalResolved`: the live thread
      // and the resumed-dialog bubbles owned by React Query are separate
      // stores, so the flip has to be applied to both.
      onEscalationOfferResolved: (offerId: string, status: ChatApprovalStatus, resolvedByName?: string | null) => {
        messagesRef.current.updateApprovalStatusById(offerId, status, resolvedByName);
        escalationRef.current.applyOfferState(offerId, status);
        // Also fires for an offer approved on another surface, where this
        // client never ran the mutation and has nothing else to tell it the
        // ticket left AI assistance.
        if (status === 'approved') onEscalated?.();
      },
      onApprovalResolved: (
        requestId: string,
        status: ChatApprovalStatus,
        _approvalType: string,
        resolvedByName?: string | null,
      ) => {
        if (status === 'approved' || status === 'rejected') {
          // Live messages — covers approvals in the current session bubble.
          messagesRef.current.updateApprovalStatusById(requestId, status, resolvedByName);
          // Historical messages — when the originating approval lives in a
          // resumed-dialog bubble owned by React Query, the live-state
          // updater above misses it. The approvalStatuses map drives
          // `processHistoricalMessages` to overlay the new status.
          approvalsRef.current.applyResolvedStatus(requestId, status, resolvedByName);
        }
      },
      onToolExecuted: (segment: ToolExecutionSegment) => {
        // No early return on a missing execId: the store falls back to
        // (toolType, toolFunction) pairing and, when nothing matches at all,
        // APPENDS the segment — dropping the chunk here made post-approval
        // single-command tool runs invisible.
        messagesRef.current.updateToolExecutionById(segment.data.toolExecutionRequestId, segment.data);
      },
      onEscalatedApproval: (
        requestId: string,
        data: { command: string; explanation?: string; approvalType: string },
      ) => {
        approvalsRef.current.handleEscalatedApproval(requestId, data);
      },
      onEscalatedApprovalResult: (
        requestId: string,
        approved: boolean,
        data: { command: string; explanation?: string; approvalType: string },
      ) => {
        approvalsRef.current.handleEscalatedApprovalResult(requestId, approved, data);
      },
      onDirectMessage: (text: string, metadata?: { ownerType?: string; displayName?: string; streamSeq?: number }) => {
        onDirectModeDetected?.();
        if (metadata?.ownerType === 'CLIENT') {
          // Echo of own message in direct mode — resolve the send flow
          setNatsStreaming(false);
          setIsTyping(false);
          const resolve = natsDoneResolverRef.current;
          natsDoneResolverRef.current = null;
          if (resolve) resolve();
          return;
        }
        const directMessage: Message = {
          id: `direct-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          name: metadata?.displayName || 'Technician',
          authorType: 'admin',
          content: text,
          timestamp: new Date(),
          streamSeq: metadata?.streamSeq,
        };
        messagesRef.current.addMessage(directMessage);
      },
      onDialogClosed: () => {
        onDialogClosed?.();
      },
      onSystemMessage: (text: string, metadata?: { streamSeq?: number }) => {
        const systemMessage: Message = {
          id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          name: text,
          authorType: 'system',
          content: '',
          timestamp: new Date(),
          streamSeq: metadata?.streamSeq,
        };
        messagesRef.current.addMessage(systemMessage);
      },
    }),
    [
      onMetadataUpdate,
      onTokenUsage,
      onDialogClosed,
      onDirectModeDetected,
      onEscalated,
      handleEscalationApprove,
      handleEscalationReject,
    ],
  );

  const incompleteState = useMemo(() => {
    if (!isResumedDialog) return undefined;

    const currentMessages = allMessages;
    const assistantSegments: MessageSegment[] = [];
    let lastAssistantId = '';
    let lastAssistantTimestamp = new Date();

    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.role === 'assistant') {
        if (!lastAssistantId) {
          lastAssistantId = msg.id;
          lastAssistantTimestamp = msg.timestamp || new Date();
        }

        if (Array.isArray(msg.content)) {
          assistantSegments.unshift(...msg.content);
        } else if (typeof msg.content === 'string' && msg.content) {
          assistantSegments.unshift({
            type: 'text',
            text: msg.content,
            id: `${msg.id}-text`,
          } as MessageSegment);
        }
      } else {
        break;
      }
    }

    if (assistantSegments.length > 0 && lastAssistantId) {
      const completeAssistantMessage = {
        id: lastAssistantId,
        role: 'assistant' as const,
        content: assistantSegments,
        name: assistantName,
        timestamp: lastAssistantTimestamp,
      };

      return extractIncompleteMessageState(completeAssistantMessage);
    }

    return undefined;
  }, [allMessages, isResumedDialog, assistantName]);

  const isCompacting = useMemo(() => {
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg?.role !== 'assistant' || !Array.isArray(lastMsg.content)) return false;
    const tail = lastMsg.content[lastMsg.content.length - 1];
    return tail?.type === 'context_compaction' && tail.status === 'started';
  }, [allMessages]);

  const enhancedInitialState = useMemo(() => {
    if (!incompleteState && escalatedApprovalsRef.current.size === 0) return undefined;

    return {
      ...incompleteState,
      escalatedApprovals: escalatedApprovalsRef.current.size > 0 ? escalatedApprovalsRef.current : undefined,
    };
  }, [incompleteState]);

  /**
   * ADOPTION ANCHOR for a resumed dialog.
   *
   * History lives in React Query and the live tail in `useChatMessages`, so on
   * re-entry the live array starts EMPTY while the turn's bubble sits in
   * history. A continuation chunk then reaches `appendSegmentsToLastAssistant`,
   * finds no assistant row to append to, and opens a SECOND bubble beside the
   * persisted one — the split turn seen after leaving and re-entering a dialog.
   *
   * The merge layer is built for the opposite: `mergeHistoryWithRealtime`
   * expects the processor to ADOPT the persisted row — keep its id while
   * accumulating more than history has — and collapses the pair by that id.
   * So seed the live array with a copy of the trailing assistant bubble,
   * carrying its persisted id. Continuations then land IN it, and the merge
   * keeps the richer live copy instead of rendering both.
   */
  const resumedAnchor = useMemo(() => {
    if (!isResumedDialog || !incompleteState) return null;
    // Backwards scan, not `[...allMessages].reverse().find()`: this memo
    // recomputes whenever `allMessages` changes, which during a stream is every
    // chunk, and the spread cloned the whole thread each time just to read its
    // last assistant row.
    let trailing: Message | undefined;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].role === 'assistant') {
        trailing = allMessages[i];
        break;
      }
    }
    if (!trailing || !Array.isArray(trailing.content)) return null;
    // COPY, not the object itself. When the trailing bubble comes from history
    // it belongs to the React Query cache, and handing that reference to live
    // state aliases the two: the live thread is then one accumulator bug away
    // from mutating cached data, and a refetch would resurrect the mutation.
    // The `content` array is cloned for the same reason — the segment
    // accumulator is handed it directly.
    return { ...trailing, content: [...trailing.content] };
  }, [isResumedDialog, incompleteState, allMessages]);

  // ONE-SHOT PER BUBBLE: keyed on the anchor's id, not a boolean, because the
  // hook is not remounted on dialog switch — a latched flag would leave every
  // later resumed dialog unanchored. Skipped once the live array already holds
  // an assistant row (a fresh send, or a previous anchor still in place).
  const anchoredIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!resumedAnchor || anchoredIdRef.current === resumedAnchor.id) return;
    if (messagesRef.current.messages.some(m => m.role === 'assistant')) return;
    anchoredIdRef.current = resumedAnchor.id;
    messagesRef.current.addMessage(resumedAnchor);
  }, [resumedAnchor]);

  /**
   * Emptying the live thread MUST drop the anchor guard with it — always, not
   * only on the path that happens to remember to.
   *
   * The guard holds the bubble id it seeded, and that id does not change when
   * the user leaves a dialog and comes back. So a clear that leaves it set
   * makes the next anchor attempt for the SAME dialog a no-op: the live array
   * stays empty, and the first continuation chunk opens the second bubble this
   * whole mechanism exists to prevent. Three call sites empty the thread
   * (`clearMessages`, `showTicketPreview`, `resumeDialog`) and only one used to
   * clear the guard, so leaving dialog A through `resumeDialog` and returning
   * reproduced the split turn exactly.
   */
  const clearLiveThread = useCallback(() => {
    messages.clearMessages();
    anchoredIdRef.current = null;
  }, [messages]);

  // Offer states deliberately do NOT feed this map. `mergeApprovalStatuses` is
  // monotonic (a resolution is never downgraded back to pending), so an
  // optimistic flip that later fails would stick there and a replayed PENDING
  // offer would render as resolved. Known gap: an offer resolved mid-stream can
  // still be replayed as pending by the next cumulative emit — fixing that
  // needs an explicit un-resolve command on the reducer.
  const { processChunk: processRealtimeChunk, reset: resetChunkProcessor } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT'],
    approvalStatuses: approvals.approvalStatuses,
    initialState: enhancedInitialState,
    batchApprovalsEnabled: flags['batch-approval'],
  });

  const natsDialogIdRef = useRef(natsDialogId);

  useEffect(() => {
    natsDialogIdRef.current = natsDialogId;
  }, [natsDialogId]);

  // JetStream may redeliver an already-applied streamSeq during reconnect; drop dupes.
  const lastAppliedStreamSeqRef = useRef<number>(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialog change is the reset trigger
  useEffect(() => {
    lastAppliedStreamSeqRef.current = -1;
    hasAppliedChunkRef.current = false;
  }, [natsDialogId]);

  // Wall-clock time of the last applied chunk, for the stall watchdog below.
  const lastChunkAtRef = useRef<number>(Date.now());
  const [isStalled, setIsStalled] = useState(false);

  const hasAppliedChunkRef = useRef(false);

  const handleJetStreamEvent = useCallback(
    (payload: unknown) => {
      const chunk = payload as ChunkData;
      if (typeof chunk.streamSeq === 'number') {
        if (chunk.streamSeq <= lastAppliedStreamSeqRef.current) return;
        lastAppliedStreamSeqRef.current = chunk.streamSeq;
      }
      if (!hasAppliedChunkRef.current) {
        hasAppliedChunkRef.current = true;
        log.info('nats:chat', 'first chunk applied', { streamSeq: chunk.streamSeq });
      }
      lastChunkAtRef.current = Date.now();
      setIsStalled(false);
      processRealtimeChunk(overrideToolTitle(chunk));
    },
    [processRealtimeChunk],
  );

  const handleJetStreamSubscribed = useCallback(() => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.resolve();
      subscriptionPromiseRef.current = null;
    }
  }, []);

  const isInitialOptStartSeqReady = !isResumedDialog || isHistoryFetched;

  // Tauri path: Rust owns the JetStream consumer, webview consumes via IPC.
  const { isSubscribed: tauriIsSubscribed } = useTauriDialogSubscription({
    enabled: isTauri && useNats && !!natsDialogId && isInitialOptStartSeqReady,
    dialogId: isTauri ? natsDialogId : null,
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onSubscribed: handleJetStreamSubscribed,
  });

  // Vite-only fallback: legacy WS-based JetStream hook from the core lib.
  const { isSubscribed: wsIsSubscribed, reconnectionCount: wsReconnectionCount } = useJetStreamDialogSubscription({
    enabled: !isTauri && useNats && !!natsDialogId && isInitialOptStartSeqReady,
    dialogId: !isTauri ? natsDialogId : null,
    streamName: CHAT_CHUNKS_STREAM,
    topic: 'message',
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onSubscribed: handleJetStreamSubscribed,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
    clientConfig: CHAT_NATS_CLIENT_CONFIG,
  });

  const isSubscribed = isTauri ? tauriIsSubscribed : wsIsSubscribed;

  // NATS reconnect: the JetStream CHAT_CHUNKS stream retains only ~10 minutes,
  // so an outage longer than that leaves a gap resume-by-seq cannot fill.
  // Refetch persisted history — mergeHistoryWithRealtime dedupes what replay
  // covers. Tauri reports reconnects via the Rust bridge; Vite via the lib hook.
  const queryClient = useQueryClient();
  const { reconnectionCount: bridgeReconnectionCount } = useTauriBridgeLiveness();
  const reconnectionCount = isTauri ? bridgeReconnectionCount : wsReconnectionCount;
  // Lazy-init to the CURRENT count: the Tauri bridge counter lives in a
  // module-level singleton and survives remounts, so starting from 0 would
  // fire a spurious history refetch on every remount after any past reconnect.
  const lastHandledReconnectRef = useRef(reconnectionCount);
  useEffect(() => {
    if (reconnectionCount <= lastHandledReconnectRef.current) return;
    lastHandledReconnectRef.current = reconnectionCount;
    if (!natsDialogId) return;
    // Arm the history query for session-created dialogs (see `backfillDialogId`).
    setBackfillDialogId(natsDialogId);
    void queryClient.invalidateQueries({ queryKey: ['dialog-messages', natsDialogId] });
  }, [reconnectionCount, natsDialogId, queryClient]);

  // Stall watchdog: while streaming and visible, surface `isStalled` if no
  // chunks have arrived for 30s. Hidden tabs suppress the timer because the
  // IPC queue still drains; chunks resume on focus.
  useEffect(() => {
    if (!natsStreaming) {
      setIsStalled(false);
      return;
    }
    lastChunkAtRef.current = Date.now();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastChunkAtRef.current = Date.now();
        setIsStalled(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastChunkAtRef.current > 30_000) {
        log.warn('nats:chat', 'stream stalled — no chunks for 30s');
        setIsStalled(true);
      }
    }, 5_000);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [natsStreaming]);

  const waitForNatsSubscription = useCallback(
    async (expectedDialogId: string): Promise<void> => {
      if (isSubscribed && natsDialogIdRef.current === expectedDialogId) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        subscriptionPromiseRef.current = { resolve, reject };

        const timeout = setTimeout(() => {
          if (subscriptionPromiseRef.current) {
            subscriptionPromiseRef.current.reject(new Error('Subscription timeout'));
            subscriptionPromiseRef.current = null;
          }
        }, 30000);

        const originalResolve = resolve;
        const originalReject = reject;

        subscriptionPromiseRef.current = {
          resolve: () => {
            clearTimeout(timeout);
            originalResolve();
          },
          reject: error => {
            clearTimeout(timeout);
            originalReject(error);
          },
        };
      });
    },
    [isSubscribed],
  );

  useEffect(() => {
    return () => {
      if (subscriptionPromiseRef.current) {
        subscriptionPromiseRef.current.reject(new Error('Component unmounted'));
        subscriptionPromiseRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);

      // Sending a message while an approval is pending is an interrupt —
      // backend will cancel that approval and emit APPROVAL_RESULT (rejected)
      // a moment later. Flip the latest pending one optimistically so the
      // card resolves at the same instant the user-message bubble appears,
      // avoiding a layout jump between the two updates.
      const pendingId = findLatestPendingId(allMessagesRef.current, pickApprovalId);
      if (pendingId) {
        messagesRef.current.updateApprovalStatusById(pendingId, 'rejected');
        approvalsRef.current.applyResolvedStatus(pendingId, 'rejected');
      }

      // Typing over a pending escalation offer supersedes it — the backend
      // publishes the SUPERSEDED block a moment later, so flip now for the
      // same no-layout-jump reason as the approval interrupt above.
      const pendingOfferId = findLatestPendingId(allMessagesRef.current, pickOfferId);
      if (pendingOfferId) {
        messagesRef.current.updateApprovalStatusById(pendingOfferId, 'cancelled');
        escalationRef.current.applyOfferState(pendingOfferId, 'cancelled');
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        name: 'You',
        content: text,
        timestamp: new Date(),
      };
      messages.addMessage(userMessage);

      setIsTyping(true);
      setNatsStreaming(true);
      messages.resetCurrentMessageSegments();

      try {
        if (!useNats) {
          throw new Error('NATS is required for incoming messages (SSE removed)');
        }

        const api = apiServiceRef.current;
        if (!api) throw new Error('API service not initialized');

        const dialogId = natsDialogId || (await api.createDialog());
        if (dialogId !== natsDialogId) {
          setNatsDialogId(dialogId);
        }

        await waitForNatsSubscription(dialogId);

        const waitForNatsDone = new Promise<void>(resolve => {
          natsDoneResolverRef.current = resolve;
        });

        await api.sendMessage({ dialogId, content: text, chatType: 'CLIENT_CHAT' });

        await waitForNatsDone;
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        if (!errorText.toLowerCase().includes('network error')) {
          setError(errorText);
          messages.addErrorMessage();
        }
      } finally {
        setIsTyping(false);
        setNatsStreaming(false);
        natsDoneResolverRef.current = null;
      }
    },
    [messages, useNats, natsDialogId, waitForNatsSubscription],
  );

  const stopGeneration = useCallback(async () => {
    const api = apiServiceRef.current;
    const dialogId = natsDialogId;
    if (!api || !dialogId) return;

    try {
      await api.stopGeneration({ dialogId, chatType: 'CLIENT_CHAT' });
    } catch (err) {
      console.error('[CHAT] Failed to stop generation:', err);
    } finally {
      setIsTyping(false);
      setNatsStreaming(false);
      const resolve = natsDoneResolverRef.current;
      natsDoneResolverRef.current = null;
      if (resolve) resolve();
    }
  }, [natsDialogId]);

  const handleQuickAction = useCallback(
    (actionText: string) => {
      sendMessage(actionText);
    },
    [sendMessage],
  );

  // Settle any pending waitForNatsSubscription before switching views: its
  // 30s timeout rejects whatever the ref points to *at firing time*, so an
  // abandoned wait would kill a fresh one and surface a stale
  // "Subscription timeout" in the new view.
  const cancelSubscriptionWait = useCallback(() => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.reject(new Error(SUBSCRIPTION_WAIT_CANCELLED));
      subscriptionPromiseRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    clearLiveThread();
    setIsTyping(false);
    setNatsStreaming(false);
    setError(null);
    setNatsDialogId(null);
    setIsResumedDialog(false);
    setIsTicketPreview(false);
    escalatedApprovalsRef.current.clear();
    approvals.clearApprovals();
    escalation.clearEscalation();
    resetChunkProcessor();
    resetDialogMessages();
    apiServiceRef.current?.reset();
    cancelSubscriptionWait();
  }, [clearLiveThread, approvals, escalation, resetChunkProcessor, resetDialogMessages, cancelSubscriptionWait]);

  const showTicketPreview = useCallback(
    (ticket: { title: string; description?: string }) => {
      clearLiveThread();
      setIsTyping(false);
      setNatsStreaming(false);
      setError(null);
      setNatsDialogId(null);
      setIsResumedDialog(false);
      setIsTicketPreview(true);
      escalatedApprovalsRef.current.clear();
      approvals.clearApprovals();
      escalation.clearEscalation();
      resetChunkProcessor();
      resetDialogMessages();
      apiServiceRef.current?.reset();
      cancelSubscriptionWait();

      const content = [
        'Your request has been received. We will contact you shortly.',
        '',
        'Subject:',
        ticket.title,
        '',
        'Description:',
        ticket.description || '(No description provided)',
      ].join('\n');

      const syntheticMessage: Message = {
        id: `ticket-preview-${Date.now()}`,
        role: 'assistant',
        name: assistantName,
        content,
        timestamp: new Date(),
        avatar: assistantAvatar,
      };

      messages.addMessage(syntheticMessage);
    },
    [
      messages,
      clearLiveThread,
      approvals,
      escalation,
      resetChunkProcessor,
      resetDialogMessages,
      assistantName,
      assistantAvatar,
      cancelSubscriptionWait,
    ],
  );

  const resumeDialog = useCallback(
    async (dialogId: string): Promise<boolean> => {
      try {
        cancelSubscriptionWait();
        setError(null);
        clearLiveThread();
        setIsTyping(false);
        setNatsStreaming(false);
        setIsTicketPreview(false);
        approvals.clearApprovals();
        escalation.clearEscalation();
        setIsResumedDialog(true);

        setNatsDialogId(dialogId);
        natsDialogIdRef.current = dialogId;

        if (apiServiceRef.current) {
          apiServiceRef.current.setDialogId(dialogId);
        }

        await waitForNatsSubscription(dialogId);

        return true;
      } catch (error) {
        // A newer view switch cancelled this resume — its state is no longer
        // ours to clobber.
        if (error instanceof Error && error.message === SUBSCRIPTION_WAIT_CANCELLED) {
          return false;
        }
        setError(error instanceof Error ? error.message : 'Failed to resume dialog');
        setIsResumedDialog(false);
        return false;
      }
    },
    [clearLiveThread, approvals, escalation, waitForNatsSubscription, cancelSubscriptionWait],
  );

  return {
    messages: allMessages,
    historyAssistantModel,
    isTyping,
    isStreaming: natsStreaming,
    isStalled,
    isCompacting,
    error,
    dialogId: natsDialogId,
    sendMessage,
    stopGeneration,
    handleQuickAction,
    clearMessages,
    resumeDialog,
    showTicketPreview,
    quickActions,
    isSettingsLoading,
    hasMessages: allMessages.length > 0,
    isTicketPreview,
    /** Ticket linked to the open dialog — escalation is keyed on it. */
    ticketId: dialogTicketId,
    requestEscalation: escalation.requestEscalation,
    // Derived from the thread rather than tracked separately: the offer can
    // arrive from Fae's tool call, a trigger, or the header button, and the
    // rendered card is the one state all of them share.
    hasPendingEscalationOffer,
    awaitingTechnicianResponse: approvals.awaitingTechnicianResponse,
    isLoadingHistory: isLoadingHistoricalMessages,
    isResumedDialog,
    hasNextPage,
    isFetchingNextPage,
    loadMoreMessages: fetchNextPage,
  };
}
