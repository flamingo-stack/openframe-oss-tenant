import { buildNatsWsUrl } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { tokenService } from '../services/tokenService';
import { log, maskToken } from '../utils/log';

export const CHAT_NATS_CLIENT_CONFIG = {
  name: 'openframe-chat',
  user: 'machine',
  pass: '',
} as const;

export const CHAT_NATS_RECONNECTION_BACKOFF = {
  fastRetries: 3,
  fastRetryDelayMs: 200,
} as const;

export interface ChatNatsConfig {
  /** Resolves the NATS WS URL or returns null when credentials aren't loaded yet. */
  getWsUrl: () => string | null;
  /** Refreshes the auth token (via tokenService) before each reconnect attempt. */
  onBeforeReconnect: () => Promise<void>;
  apiBaseUrl: string | null;
  token: string | null;
}

/**
 * Single source of truth for openframe-chat's NATS WS URL builder, auth-token plumbing,
 * and onBeforeReconnect. Both useConnectionStatus and useChat consume this — without it
 * each owned a parallel copy of `getNatsWsUrl`, `handleBeforeReconnect`, and the
 * tokenService subscription useEffects. Token state stays in sync across instances
 * because tokenService is itself a module-level singleton with its own pub/sub.
 */
export function useChatNatsConfig(): ChatNatsConfig {
  const [apiBaseUrl, setApiBaseUrl] = useState(tokenService.getCurrentApiBaseUrl());
  const [token, setToken] = useState(tokenService.getCurrentToken());

  useEffect(() => tokenService.onTokenUpdate(setToken), []);
  useEffect(() => tokenService.onApiUrlUpdate(setApiBaseUrl), []);

  const getWsUrl = useCallback((): string | null => {
    if (!apiBaseUrl || !token) return null;
    log.info('nats', `building WS URL (token: ${maskToken(token)})`);
    return buildNatsWsUrl(apiBaseUrl, {
      token,
      includeAuthParam: true,
      source: 'dashboard',
    });
  }, [apiBaseUrl, token]);

  const onBeforeReconnect = useCallback(async () => {
    log.info('nats', 'disconnected — refreshing token before reconnect');
    await tokenService.refreshToken();
  }, []);

  return useMemo(
    () => ({ getWsUrl, onBeforeReconnect, apiBaseUrl, token }),
    [getWsUrl, onBeforeReconnect, apiBaseUrl, token],
  );
}
