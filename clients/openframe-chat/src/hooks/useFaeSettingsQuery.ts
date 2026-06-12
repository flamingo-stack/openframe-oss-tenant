import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type FaeSettingsResponse, faeSettingsService } from '../services/faeSettingsService';
import { tokenService } from '../services/tokenService';

/** Cache key scoped to the active connection so settings from a previous
 *  server/identity are never served after the token or API URL changes. */
export const faeSettingsQueryKey = (apiBaseUrl: string | null) => ['faeSettings', { apiBaseUrl }] as const;

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
 * Loads FaeSettings (assistant customization incl. quickActions) from
 * /chat/graphql. `data` is `null` when no record exists yet. The query waits
 * for the token/API URL to be available; readiness is recomputed on every
 * token/API update (and can flip back to false when credentials drop), and
 * the cache is keyed by the API base URL so a connection change refetches
 * instead of serving stale settings.
 */
export function useFaeSettingsQuery({ enabled }: { enabled: boolean }) {
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

  return useQuery<FaeSettingsResponse | null>({
    queryKey: faeSettingsQueryKey(connection.apiBaseUrl),
    queryFn: () => faeSettingsService.fetchFaeSettings(),
    enabled: enabled && connection.isReady,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
