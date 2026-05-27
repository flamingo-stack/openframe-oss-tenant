'use client';

import {
  buildNatsWsUrl,
  type ChunkData,
  type NatsMessageType,
  useJetStreamDialogSubscription,
  useNatsDialogSubscription as useNatsDialogSubscriptionCore,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { runtimeEnv } from '@/lib/runtime-config';
import { NATS_TOPICS, STORAGE_KEYS } from '../constants';

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

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl();
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return null;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
  } catch {
    return null;
  }
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
  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl);
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
  const [token, setToken] = useState<string | null>(isDevTicketEnabled ? getAccessToken() : null);
  const hasCaughtUpRef = useRef(false);
  const [useJetstream] = useState(() => featureFlags.aiStreamingJetstream.enabled());

  useEffect(() => {
    if (!isDevTicketEnabled) return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACCESS_TOKEN) setToken(getAccessToken());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isDevTicketEnabled]);

  const dispatchRef = useRef(dispatchChunk);
  useEffect(() => {
    dispatchRef.current = dispatchChunk;
  }, [dispatchChunk]);

  const legacyProcessRef = useRef(legacyProcessChunk);
  useEffect(() => {
    legacyProcessRef.current = legacyProcessChunk;
  }, [legacyProcessChunk]);

  const getNatsWsUrl = useMemo(() => {
    return (): string | null => {
      if (!apiBaseUrl) return null;
      if (isDevTicketEnabled && !token) return null;
      return buildNatsWsUrl(apiBaseUrl, {
        token: token || undefined,
        includeAuthParam: isDevTicketEnabled,
        source: 'dashboard',
      });
    };
  }, [apiBaseUrl, token, isDevTicketEnabled]);

  const clientConfig = useMemo(
    () => ({
      name: `openframe-frontend-ticket-${dialogId ?? 'idle'}`,
      user: 'machine',
      pass: '',
    }),
    [dialogId],
  );

  const reconnectionBackoff = useMemo(
    () => ({
      fastRetries: 3,
      fastRetryDelayMs: 200,
      initialDelayMs: 1000,
      multiplier: 2,
      maxDelayMs: 30_000,
    }),
    [],
  );

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

  const handleBeforeReconnect = useCallback(async () => {
    try {
      await apiClient.get('/api/me');
    } catch {
      // If refresh fails, apiClient will force-logout
    } finally {
      if (isDevTicketEnabled) setToken(getAccessToken());
    }
  }, [isDevTicketEnabled]);

  const { reconnectionCount: legacyReconnectionCount } = useNatsDialogSubscriptionCore({
    enabled: !useJetstream && !!dialogId,
    dialogId,
    topics: LEGACY_TOPICS,
    onEvent: handleNatsEvent,
    onSubscribed: handleLegacySubscribed,
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
    reconnectionBackoff,
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
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
    reconnectionBackoff,
  });

  useJetStreamDialogSubscription({
    enabled: useJetstream && !!dialogId && isInitialOptStartSeqReady,
    dialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: NATS_TOPICS.ADMIN_MESSAGE,
    optStartSeq: adminInitialOptStartSeq,
    onEvent: handleAdminJsEvent,
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
    reconnectionBackoff,
  });

  return null;
}
