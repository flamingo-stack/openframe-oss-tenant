'use client';

/**
 * useRealtimeChunkProcessor — NATS chunks → the SHARED lib stream reducer.
 *
 * The lib used to ship a hook of this name that carried its own ~490-LOC
 * chunk parser and accumulator. That implementation is gone: the chat
 * unification made `createChatStreamReducer` the single owner of every
 * accumulation rule (segment routing, EXECUTING→EXECUTED merging, approval
 * flips, participant dedup, direct-mode barrier, stream phase), fed by the
 * single wire decoder `decodeNatsChunk`. This desktop client was the last
 * consumer of the removed hook.
 *
 * What survives here is ONLY the callback shim: the reducer publishes its
 * observations as `ChatReducerEffect`s (a sink the lib added precisely for
 * callback-contract consumers), and this hook forwards them to the callbacks
 * `useChat` already implements. Nothing in this file accumulates anything —
 * that is the whole point of the migration.
 *
 * Deliberately NOT built on `useChatStreamReducer` / `createChatDialogStore`:
 * those exist to OWN the thread and hand it back as state. This client keeps
 * its thread in `useChatMessages` (React state, merged with React Query
 * history in `useChat`), so it needs the reducer as a pure event machine and
 * takes its output through effects. A dialog store would add an LRU registry
 * and a second copy of the thread for no consumer.
 */

import { decodeNatsChunk } from '@flamingo-stack/openframe-frontend-core/chat-protocol';
import {
  type ChatApprovalStatus,
  type ChatReducerEffect,
  type ChatStreamReducer,
  createChatStreamReducer,
  type InitializeExtras,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * The callbacks `useChat` implements. Names and payloads match the reducer's
 * effect names one-for-one — the shim is a forward, not a translation, so a
 * new effect only needs adding here to reach the host.
 */
export interface RealtimeChunkCallbacks {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onSegmentsUpdate?: (...args: never[]) => void;
  onMetadata?: (...args: never[]) => void;
  onTokenUsage?: (...args: never[]) => void;
  onError?: (...args: never[]) => void;
  onUserMessage?: (...args: never[]) => void;
  onDirectMessage?: (...args: never[]) => void;
  onSystemMessage?: (...args: never[]) => void;
  onEscalatedApproval?: (...args: never[]) => void;
  onEscalatedApprovalResult?: (...args: never[]) => void;
  onApprovalResolved?: (...args: never[]) => void;
  onToolExecuted?: (...args: never[]) => void;
  onAgentBusy?: () => void;
  onDialogClosed?: (...args: never[]) => void;
  onApprove?: (requestId?: string) => Promise<void> | void;
  onReject?: (requestId?: string) => Promise<void> | void;
}

export interface UseRealtimeChunkProcessorOptions {
  callbacks: RealtimeChunkCallbacks;
  /** Approval types rendered inline; others escalate. Default ['CLIENT']. */
  displayApprovalTypes?: string[];
  /** Persisted request-id → status, consulted when an APPROVAL_REQUEST replays. */
  approvalStatuses?: Record<string, string>;
  /** Unfinished trailing turn of a resumed dialog (accumulator seed). */
  initialState?: InitializeExtras & {
    escalatedApprovals?: Map<string, unknown>;
  };
  batchApprovalsEnabled?: boolean;
  /** Host-known technician takeover — engages the direct-mode barrier early. */
  isDirectMode?: boolean;
}

export interface UseRealtimeChunkProcessorReturn {
  /** Decode one raw NATS chunk and apply it. Unknown chunks are ignored. */
  processChunk: (chunk: unknown) => void;
  /** Drop the per-turn kernel (dialog switch / stop). */
  reset: () => void;
}

export function useRealtimeChunkProcessor({
  callbacks,
  displayApprovalTypes = ['CLIENT'],
  approvalStatuses,
  initialState,
  batchApprovalsEnabled = true,
  isDirectMode = false,
}: UseRealtimeChunkProcessorOptions): UseRealtimeChunkProcessorReturn {
  // LATEST-REF: reducer creation options are consulted ONCE, so the effect
  // sink must read through a ref or it would freeze the first render's
  // callbacks for the reducer's whole life.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // biome-ignore lint/correctness/useExhaustiveDependencies: creation options are consulted ONCE by the reducer; re-creating it when a flag or the status map changes would drop the turn in flight. Late-varying inputs are read through refs (callbacks) or pushed in as commands (mergeApprovalStatuses below).
  const reducer = useMemo<ChatStreamReducer>(
    () =>
      createChatStreamReducer({
        transport: 'nats',
        displayApprovalTypes,
        batchApprovalsEnabled,
        isDirectMode,
        approvalStatuses: approvalStatuses as Record<string, ChatApprovalStatus> | undefined,
        // Approve/reject are stamped onto approval segments by the accumulator,
        // so they too must be read late — the host rebuilds them per render.
        callbacks: {
          onApprove: requestId => callbacksRef.current.onApprove?.(requestId),
          onReject: requestId => callbacksRef.current.onReject?.(requestId),
        },
        onEffect: (effect: ChatReducerEffect) => {
          const handler = callbacksRef.current[effect.name as keyof RealtimeChunkCallbacks] as
            | ((...args: unknown[]) => void)
            | undefined;
          handler?.(...effect.args);
        },
      }),
    [],
  );

  // Resumed dialog: seed the per-turn kernel from the unfinished trailing run
  // so continuation chunks merge into it instead of replaying into a fresh
  // bubble. ONE-SHOT — a second seed would re-apply segments already rendered.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !initialState) return;
    seededRef.current = true;
    reducer.initializeWithState(null, {
      ...initialState,
      // `resumed`: a MESSAGE_START already fired server-side, so a chunk that
      // arrives with no preceding turn-start must APPEND to the restored
      // bubble rather than replace its segments through the cold-start path.
      resumed: true,
    });
    // An unfinished tail that is the AGENT's own work means it is STILL
    // WORKING, and this host drives its activity indicator off `onAgentBusy`
    // rather than off the reducer's phase. Nothing else re-fires it after a
    // reload: the run's EXECUTING chunk is long past and its EXECUTED one may
    // be minutes away, so the thread looked idle while work was in flight. The
    // host clears the lock the same way it always has — stream end, error,
    // Stop, or a fresh server-side IDLE.
    //
    // `agentBusy` is derived by the lib extractor, NOT re-decided here: the
    // distinction it encodes (an approved command still running vs an approval
    // still PENDING, where the agent is blocked on the user and spinning would
    // claim work that is not happening) has to match what the web host shows.
    // Reading `executingTools` instead missed the whole approval path — a batch
    // records its runs inside the batch segment, not as executing tools.
    if (initialState.agentBusy) {
      callbacksRef.current.onAgentBusy?.();
    }
  }, [initialState, reducer]);

  // Persisted statuses can arrive after the reducer exists (history fetch
  // resolving late). The merge is state-monotonic in the reducer: a resolved
  // status is never downgraded back to pending by a stale snapshot.
  useEffect(() => {
    if (!approvalStatuses || Object.keys(approvalStatuses).length === 0) return;
    reducer.mergeApprovalStatuses(approvalStatuses as Record<string, ChatApprovalStatus>);
  }, [approvalStatuses, reducer]);

  const processChunk = useCallback(
    (chunk: unknown) => {
      const event = decodeNatsChunk(chunk);
      if (!event) return;
      reducer.apply(event);
    },
    [reducer],
  );

  const reset = useCallback(() => {
    reducer.reset();
    seededRef.current = false;
  }, [reducer]);

  return { processChunk, reset };
}
