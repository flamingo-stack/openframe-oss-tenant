'use client';

import { buildNatsWsUrl } from '@flamingo-stack/openframe-frontend-core';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '@/app/(app)/tickets/constants';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { runtimeEnv } from '@/lib/runtime-config';
import { getAccessTokenSync, isBearerAuthMode } from '@/lib/token-store';

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl();
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return null;
}

function getAccessToken(): string | null {
  return getAccessTokenSync();
}

export interface NatsAppConfig {
  getWsUrl: () => string | null;
  onBeforeReconnect: () => Promise<void>;
  urlRevision: string;
  isAuthenticated: boolean;
  userId: string | null;
}

const NatsAppConfigContext = createContext<NatsAppConfig | null>(null);

function useNatsAppConfigState(): NatsAppConfig {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id) ?? null;

  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl);
  const isDevTicketEnabled = isBearerAuthMode();
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

  useEffect(() => {
    if (!isDevTicketEnabled || !isAuthenticated) return;
    setToken(getAccessToken());
  }, [isDevTicketEnabled, isAuthenticated]);

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
