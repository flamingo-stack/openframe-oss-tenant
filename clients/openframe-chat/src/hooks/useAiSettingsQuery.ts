import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type AiSettingsResponse, aiSettingsService } from '../services/aiSettingsService';
import { tokenService } from '../services/tokenService';

/** Cache key scoped to the active connection so settings from a previous
 *  server/identity are never served after the token or API URL changes. */
export const aiSettingsQueryKey = (apiBaseUrl: string | null) => ['aiSettings', { apiBaseUrl }] as const;

interface ConnectionState {
  isReady: boolean;
  apiBaseUrl: string | null;
}

function readConnectionState(): ConnectionState {
  const token = tokenService.getCurrentToken();
  const apiBaseUrl = tokenService.getCurrentApiBaseUrl();
  return { isReady: Boolean(token && apiBaseUrl), apiBaseUrl: apiBaseUrl ?? null };
}

/**
 * Live token/API-URL readiness, recomputed on every tokenService update.
 * Shared by the server-backed queries so their `enabled` and cache keys track
 * connection changes identically.
 */
export function useApiConnectionState(): ConnectionState {
  const [connection, setConnection] = useState<ConnectionState>(readConnectionState);

  useEffect(() => {
    const syncConnection = () => setConnection(readConnectionState());

    syncConnection();

    const unsubToken = tokenService.onTokenUpdate(syncConnection);
    const unsubUrl = tokenService.onApiUrlUpdate(syncConnection);

    return () => {
      unsubToken();
      unsubUrl();
    };
  }, []);

  return connection;
}

/**
 * Loads the client assistant's appearance (clientView) and quick actions
 * (clientAiConfig) from /chat/graphql. `data` is `null` when no record exists yet.
 * The query waits for the token/API URL to be available; readiness is
 * recomputed on every token/API update (and can flip back to false when
 * credentials drop), and the cache is keyed by the API base URL so a connection
 * change refetches instead of serving stale settings.
 */
export function useAiSettingsQuery({ enabled }: { enabled: boolean }) {
  const connection = useApiConnectionState();

  return useQuery<AiSettingsResponse | null>({
    queryKey: aiSettingsQueryKey(connection.apiBaseUrl),
    queryFn: () => aiSettingsService.fetchAiSettings(),
    enabled: enabled && connection.isReady,
    retry: 1,
    // Admin edits must land in running sessions without a restart. There is no
    // server push for configuration changes (and no server-side cache - every
    // read returns fresh values), so the client polls: refetch on refocus and
    // reconnect for immediacy, plus a background interval so an idle, unfocused
    // chat window also converges within a minute. Background refetches keep the
    // previous data, so the UI never flickers while polling.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}
