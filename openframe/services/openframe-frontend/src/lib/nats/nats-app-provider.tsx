'use client';

import { buildNatsWsUrl } from '@flamingo-stack/openframe-frontend-core';
import { NatsProvider } from '@flamingo-stack/openframe-frontend-core/nats';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
  } catch {
    return null;
  }
}

const RECONNECTION_BACKOFF = {
  fastRetries: 3,
  fastRetryDelayMs: 200,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30_000,
} as const;

const CLIENT_CONFIG = {
  name: 'openframe-frontend-app',
  user: 'machine',
  pass: '',
} as const;

export function NatsAppProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);

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
      // apiClient handles 401 by force-logging-out; allow reconnect attempt to fail naturally
    } finally {
      if (isDevTicketEnabled) {
        setToken(getAccessToken());
      }
    }
  }, [isDevTicketEnabled]);

  // In cookie-mode the token is sent via cookies and the WS URL is stable across silent token
  // rotations — excluding token avoids tearing down the shared NATS connection on every refresh.
  // In dev-ticket mode the token IS embedded in the URL query string, so the URL itself changes
  // on rotation; we must include it here or the captured wsUrl will go stale and reconnects
  // (which compare freshUrl === wsUrl) will silently abort.
  const tokenForRevision = isDevTicketEnabled ? (token ?? '') : '';
  const urlRevision = useMemo(
    () =>
      `${isAuthenticated ? '1' : '0'}|${userId ?? ''}|${apiBaseUrl ?? ''}|${isDevTicketEnabled ? '1' : '0'}|${tokenForRevision}`,
    [isAuthenticated, userId, apiBaseUrl, isDevTicketEnabled, tokenForRevision],
  );

  return (
    <NatsProvider
      getWsUrl={getWsUrl}
      onBeforeReconnect={onBeforeReconnect}
      clientConfig={CLIENT_CONFIG}
      reconnectionBackoff={RECONNECTION_BACKOFF}
      urlRevision={urlRevision}
    >
      {children}
    </NatsProvider>
  );
}
