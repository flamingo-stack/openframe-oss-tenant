import { buildNatsWsUrl, useNatsDialogSubscription } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supportedModelsService } from '../services/supportedModelsService';
import { tokenService } from '../services/tokenService';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface AiConfiguration {
  id: string;
  provider: string;
  modelName: string;
  isActive: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseConnectionStatusReturn {
  status: ConnectionStatus;
  serverUrl: string | null;
  aiConfiguration: AiConfiguration | null;
  isFullyLoaded: boolean;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [aiConfiguration, setAiConfiguration] = useState<AiConfiguration | null>(null);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  const [apiBaseUrl, setApiBaseUrl] = useState(tokenService.getCurrentApiBaseUrl());
  const [token, setToken] = useState(tokenService.getCurrentToken());

  useEffect(() => {
    const initializeCredentials = async () => {
      try {
        if (!apiBaseUrl) {
          await tokenService.initApiUrl();
          setApiBaseUrl(tokenService.getCurrentApiBaseUrl());
        }

        if (!token) {
          await tokenService.requestToken();
          setToken(tokenService.getCurrentToken());
        }
      } catch (error) {
        console.error('Failed to initialize credentials:', error);
      }
    };

    initializeCredentials();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const unsubscribeToken = tokenService.onTokenUpdate(setToken);
    const unsubscribeApiUrl = tokenService.onApiUrlUpdate(setApiBaseUrl);

    return () => {
      unsubscribeToken();
      unsubscribeApiUrl();
    };
  }, []);

  useEffect(() => {
    if (apiBaseUrl) {
      setServerUrl(apiBaseUrl.replace(/^https?:\/\//, ''));
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    const loadAiConfiguration = async () => {
      try {
        if (!apiBaseUrl || !token) {
          return;
        }

        const response = await fetch(`${apiBaseUrl}/chat/api/v1/ai-configuration`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response && response.ok) {
          const config = await response.json();
          setAiConfiguration(config);

          await supportedModelsService.loadSupportedModels();
          setIsFullyLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load AI configuration:', error);
      }
    };

    loadAiConfiguration();
  }, [apiBaseUrl, token]);

  const getNatsWsUrl = useMemo(() => {
    return (): string => {
      if (!apiBaseUrl || !token) return '';
      return buildNatsWsUrl(apiBaseUrl, { token, includeAuthParam: true });
    };
  }, [apiBaseUrl, token]);

  const clientConfig = useMemo(
    () => ({
      name: 'openframe-chat-status',
      user: 'machine',
      pass: '',
    }),
    [],
  );

  const handleBeforeReconnect = useCallback(async () => {
    console.log('[CONNECTION STATUS] NATS disconnected, refreshing token before reconnect...');
    await tokenService.refreshToken();
  }, []);

  const { isConnected } = useNatsDialogSubscription({
    enabled: !!apiBaseUrl && !!token,
    dialogId: null, // No dialog subscription, just connection monitoring
    topics: [],
    onConnect: () => {
      setStatus('connected');
    },
    onDisconnect: () => {
      setStatus('disconnected');
    },
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
  });

  useEffect(() => {
    if (!apiBaseUrl || !token) {
      setStatus('connecting');
      return;
    }

    if (isConnected) {
      setStatus('connected');
    } else {
      setStatus('disconnected');
    }
  }, [isConnected, apiBaseUrl, token]);

  const displayUrl = serverUrl?.replace(/^https?:\/\//, '') || null;

  return { status, serverUrl: displayUrl, aiConfiguration, isFullyLoaded };
}
