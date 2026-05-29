'use client';

import {
  type ChunkData,
  type NatsMessageType,
  useJetStreamDialogSubscription,
  useNatsDialogSubscription as useNatsDialogSubscriptionCore,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { useNatsAppConfig } from '@/lib/nats/nats-app-config';
import { NATS_TOPICS } from '../constants';

const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';
const LEGACY_TOPICS: NatsMessageType[] = [NATS_TOPICS.MESSAGE, NATS_TOPICS.ADMIN_MESSAGE];

interface TicketDialogSubscriptionProps {
  dialogId: string | null;
  /** Dispatch a chunk directly to side processors. */
  dispatchChunk: (chunk: ChunkData, messageType: NatsMessageType) => void;
  /** Buffered chunk processor from the parent's `useChunkCatchup`. */
  legacyProcessChunk: (chunk: ChunkData, messageType: NatsMessageType) => boolean;
  /** Initial catch-up on legacy `onSubscribed`. */
  catchUpChunks: () => Promise<void>;
  /** Re-run catch-up after a legacy NATS reconnect. */
  resetAndCatchUp: () => Promise<void>;
  /** Resume sequence for the CLIENT topic; 0 = replay from stream start (per-dialog filter). */
  clientInitialOptStartSeq: number;
  /** Resume sequence for the ADMIN topic; 0 = replay from stream start (per-dialog filter). */
  adminInitialOptStartSeq: number;
  /** Gates JetStream consumer creation until both sides' history has loaded. */
  isInitialOptStartSeqReady: boolean;
}

export function TicketDialogSubscription({
  dialogId,
  dispatchChunk,
  legacyProcessChunk,
  catchUpChunks,
  resetAndCatchUp,
  clientInitialOptStartSeq,
  adminInitialOptStartSeq,
  isInitialOptStartSeqReady,
}: TicketDialogSubscriptionProps) {
  const { getWsUrl, onBeforeReconnect } = useNatsAppConfig();
  const hasCaughtUpRef = useRef(false);
  const [useJetstream] = useState(() => featureFlags.aiStreamingJetstream.enabled());

  const dispatchRef = useRef(dispatchChunk);
  useEffect(() => {
    dispatchRef.current = dispatchChunk;
  }, [dispatchChunk]);

  const legacyProcessRef = useRef(legacyProcessChunk);
  useEffect(() => {
    legacyProcessRef.current = legacyProcessChunk;
  }, [legacyProcessChunk]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialogId change is the reset trigger
  useEffect(() => {
    hasCaughtUpRef.current = false;
  }, [dialogId]);

  // JetStream redeliveries may repeat a streamSeq during reconnect; drop any
  // we've already applied. Tracked per topic.
  const lastClientStreamSeqRef = useRef<number>(-1);
  const lastAdminStreamSeqRef = useRef<number>(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialogId change is the reset trigger
  useEffect(() => {
    if (!useJetstream) return;
    lastClientStreamSeqRef.current = -1;
    lastAdminStreamSeqRef.current = -1;
  }, [useJetstream, dialogId]);

  const handleNatsEvent = useCallback((payload: unknown, messageType: NatsMessageType) => {
    legacyProcessRef.current(payload as ChunkData, messageType);
  }, []);

  const handleClientJsEvent = useCallback((payload: unknown) => {
    const chunk = payload as ChunkData;
    if (typeof chunk.streamSeq === 'number') {
      if (chunk.streamSeq <= lastClientStreamSeqRef.current) return;
      lastClientStreamSeqRef.current = chunk.streamSeq;
    }
    dispatchRef.current(chunk, NATS_TOPICS.MESSAGE);
  }, []);

  const handleAdminJsEvent = useCallback((payload: unknown) => {
    const chunk = payload as ChunkData;
    if (typeof chunk.streamSeq === 'number') {
      if (chunk.streamSeq <= lastAdminStreamSeqRef.current) return;
      lastAdminStreamSeqRef.current = chunk.streamSeq;
    }
    dispatchRef.current(chunk, NATS_TOPICS.ADMIN_MESSAGE);
  }, []);

  const handleLegacySubscribed = useCallback(async () => {
    if (hasCaughtUpRef.current || !dialogId) return;
    hasCaughtUpRef.current = true;
    await catchUpChunks();
  }, [dialogId, catchUpChunks]);

  const { reconnectionCount: legacyReconnectionCount } = useNatsDialogSubscriptionCore({
    enabled: !useJetstream && !!dialogId,
    dialogId,
    topics: LEGACY_TOPICS,
    onEvent: handleNatsEvent,
    onSubscribed: handleLegacySubscribed,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
  });

  useEffect(() => {
    if (useJetstream) return;
    if (legacyReconnectionCount > 0 && dialogId) {
      resetAndCatchUp();
    }
  }, [useJetstream, legacyReconnectionCount, dialogId, resetAndCatchUp]);

  useJetStreamDialogSubscription({
    enabled: useJetstream && !!dialogId && isInitialOptStartSeqReady,
    dialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: NATS_TOPICS.MESSAGE,
    optStartSeq: clientInitialOptStartSeq,
    onEvent: handleClientJsEvent,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
  });

  useJetStreamDialogSubscription({
    enabled: useJetstream && !!dialogId && isInitialOptStartSeqReady,
    dialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: NATS_TOPICS.ADMIN_MESSAGE,
    optStartSeq: adminInitialOptStartSeq,
    onEvent: handleAdminJsEvent,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
  });

  return null;
}
