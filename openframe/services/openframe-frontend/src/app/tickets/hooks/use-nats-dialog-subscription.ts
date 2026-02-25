'use client';

import {
  buildNatsWsUrl,
  type NatsMessageType,
  type UseNatsDialogSubscriptionReturn,
  useNatsDialogSubscription as useNatsDialogSubscriptionCore,
} from '@flamingo-stack/openframe-frontend-core';
import { useEffect, useMemo, useState } from 'react';
import { runtimeEnv } from '@/lib/runtime-config';
import { STORAGE_KEYS } from '../constants';

const ADMIN_TOPICS: NatsMessageType[] = ['message', 'admin-message'] as const;

export type { NatsMessageType, UseNatsDialogSubscriptionReturn };

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

interface UseNatsDialogSubscriptionArgs {
  enabled: boolean;
  dialogId: string | null;
  onEvent?: (payload: unknown, messageType: NatsMessageType) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSubscribed?: () => void;
  onBeforeReconnect?: () => Promise<void> | void;
}

export function useNatsDialogSubscription({
  enabled,
  dialogId,
  onEvent,
  onConnect,
  onDisconnect,
  onSubscribed,
  onBeforeReconnect,
}: UseNatsDialogSubscriptionArgs): UseNatsDialogSubscriptionReturn {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(getApiBaseUrl);
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

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl());
  }, []);

  const getNatsWsUrl = useMemo(() => {
    return (): string | null => {
      if (!apiBaseUrl) return null;

      if (isDevTicketEnabled && !token) return null;

      return buildNatsWsUrl(apiBaseUrl, {
        token: token || undefined,
        includeAuthParam: isDevTicketEnabled,
      });
    };
  }, [apiBaseUrl, token, isDevTicketEnabled]);

  const clientConfig = useMemo(
    () => ({
      name: 'openframe-frontend-mingo',
      user: 'machine',
      pass: '',
    }),
    [],
  );

  return useNatsDialogSubscriptionCore({
    enabled,
    dialogId,
    topics: ADMIN_TOPICS,
    onEvent,
    onConnect,
    onDisconnect,
    onSubscribed,
    onBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
  });
}
