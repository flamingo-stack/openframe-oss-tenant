'use client';

import { buildNatsWsUrl } from '@flamingo-stack/openframe-frontend-core';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '@/app/(app)/tickets/constants';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { runtimeEnv } from '@/lib/runtime-config';

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl();
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return null;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

export interface NatsAppConfig {
  /** Resolves the current NATS WS URL or returns null when not yet available. */
  getWsUrl: () => string | null;
  /** Refreshes the auth token (via /api/me) before each reconnect attempt. */
  onBeforeReconnect: () => Promise<void>;
  /**
   * Opaque revision string that changes whenever the resolved URL would change.
   * Pass to <NatsProvider urlRevision={...}> or any equivalent dependency surface
   * so the connection effect re-runs at the right moments.
   */
  urlRevision: string;
  isAuthenticated: boolean;
  userId: string | null;
}

const NatsAppConfigContext = createContext<NatsAppConfig | null>(null);

/**
 * Computes the live NATS app config state. Single instance per app so token state
 * (which is updated via in-tab onBeforeReconnect, NOT via storage events) is not
 * duplicated across consumers — duplication would let provider and chat hooks
 * drift into different tokens after a silent refresh.
 */
function useNatsAppConfigState(): NatsAppConfig {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id) ?? null;

  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl);
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
  const [token, setToken] = useState<string | null>(isDevTicketEnabled ? getAccessToken() : null);

  useEffect(() => {
    if (!isDevTicketEnabled) return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACCESS_TOKEN) {
        setToken(getAccessToken());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isDevTicketEnabled]);

  const getWsUrl = useCallback((): string | null => {
    if (!isAuthenticated || !userId) return null;
    if (!apiBaseUrl) return null;
    if (isDevTicketEnabled && !token) return null;
    return buildNatsWsUrl(apiBaseUrl, {
      token: token || undefined,
      includeAuthParam: isDevTicketEnabled,
      source: 'dashboard',
    });
  }, [apiBaseUrl, token, isDevTicketEnabled, isAuthenticated, userId]);

  const onBeforeReconnect = useCallback(async () => {
    try {
      await apiClient.me();
    } catch {
      // apiClient handles 401 by force-logging-out; let reconnect fail naturally
    } finally {
      if (isDevTicketEnabled) {
        setToken(getAccessToken());
      }
    }
  }, [isDevTicketEnabled]);

  // In cookie mode the WS URL is stable across silent token rotations, so the token
  // is omitted from the revision. In dev-ticket mode the token IS in the URL query
  // string, so it must be in the revision or the captured wsUrl goes stale and
  // reconnect's `freshUrl === wsUrl` guard short-circuits forever.
  const tokenForRevision = isDevTicketEnabled ? (token ?? '') : '';
  const urlRevision = useMemo(
    () =>
      `${isAuthenticated ? '1' : '0'}|${userId ?? ''}|${apiBaseUrl ?? ''}|${isDevTicketEnabled ? '1' : '0'}|${tokenForRevision}`,
    [isAuthenticated, userId, apiBaseUrl, isDevTicketEnabled, tokenForRevision],
  );

  return useMemo(
    () => ({ getWsUrl, onBeforeReconnect, urlRevision, isAuthenticated, userId }),
    [getWsUrl, onBeforeReconnect, urlRevision, isAuthenticated, userId],
  );
}

/**
 * Owns the single NatsAppConfig state and exposes it via context. Must wrap any
 * consumer of useNatsAppConfig — mount once at the root (NatsAppProvider does this
 * internally).
 */
export function NatsAppConfigProvider({ children }: { children: ReactNode }) {
  const value = useNatsAppConfigState();
  return <NatsAppConfigContext.Provider value={value}>{children}</NatsAppConfigContext.Provider>;
}

export function useNatsAppConfig(): NatsAppConfig {
  const ctx = useContext(NatsAppConfigContext);
  if (!ctx) {
    throw new Error('useNatsAppConfig must be used inside <NatsAppConfigProvider> (mounted by <NatsAppProvider>)');
  }
  return ctx;
}
