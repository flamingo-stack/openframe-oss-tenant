import { useNatsDialogSubscription } from '@flamingo-stack/openframe-frontend-core';
import { useEffect, useState } from 'react';
import { useTauriBridgeLiveness } from '../services/natsTauri';
import { supportedModelsService } from '../services/supportedModelsService';
import { tokenService } from '../services/tokenService';
import { log } from '../utils/log';
import { isTauri } from '../utils/runtime';
import { CHAT_NATS_CLIENT_CONFIG, CHAT_NATS_RECONNECTION_BACKOFF, useChatNatsConfig } from './useChatNatsConfig';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  serverUrl: string | null;
  isFullyLoaded: boolean;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  const { getWsUrl, onBeforeReconnect, apiBaseUrl, token } = useChatNatsConfig();

  useEffect(() => {
    const initializeCredentials = async () => {
      try {
        if (!apiBaseUrl) {
          await tokenService.initApiUrl();
        }
        if (!token) {
          await tokenService.requestToken();
        }
      } catch (error) {
        log.error('startup', 'failed to initialize credentials', String(error));
        console.error('Failed to initialize credentials:', error);
      }
    };

    initializeCredentials();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (apiBaseUrl) {
      setServerUrl(apiBaseUrl.replace(/^https?:\/\//, ''));
    }
  }, [apiBaseUrl]);

  // The model shown in the footer comes from per-chat sources (stream
  // metadata / message provenance) — only the model display-name catalog is
  // needed up front. The deprecated tenant-wide /chat/api/v1/ai-configuration
  // read is gone: it could disagree with the customer's effective model.
  useEffect(() => {
    const loadModelCatalog = async () => {
      if (!apiBaseUrl || !token) {
        return;
      }
      try {
        await supportedModelsService.loadSupportedModels();
      } catch (error) {
        log.error('ai-config', 'failed to load supported models', String(error));
        console.error('Failed to load supported models:', error);
      } finally {
        // Raw model names still render if the catalog failed — never hold the
        // footer on a skeleton forever.
        setIsFullyLoaded(true);
      }
    };

    loadModelCatalog();
  }, [apiBaseUrl, token]);

  // Tauri path: Rust owns the connection — read state from the bridge.
  const { isConnected: tauriConnected } = useTauriBridgeLiveness();

  // Vite-only fallback: a `dialogId: null` keep-alive subscription via WS.
  const { isConnected: wsConnected } = useNatsDialogSubscription({
    enabled: !isTauri && !!apiBaseUrl && !!token,
    dialogId: null,
    topics: [],
    onConnect: () => {
      log.info('nats:status', 'connected (ws)');
    },
    onDisconnect: () => {
      log.warn('nats:status', 'disconnected (ws)');
    },
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
    clientConfig: CHAT_NATS_CLIENT_CONFIG,
    reconnectionBackoff: CHAT_NATS_RECONNECTION_BACKOFF,
  });

  const isConnected = isTauri ? tauriConnected : wsConnected;

  useEffect(() => {
    if (!apiBaseUrl || !token) {
      setStatus('connecting');
      return;
    }
    setStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected, apiBaseUrl, token]);

  const displayUrl = serverUrl?.replace(/^https?:\/\//, '') || null;

  return { status, serverUrl: displayUrl, isFullyLoaded };
}
