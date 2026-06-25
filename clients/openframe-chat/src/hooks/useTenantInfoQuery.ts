import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type TenantInfo, tenantInfoService } from '../services/tenantInfoService';
import { tokenService } from '../services/tokenService';

/** Cache key scoped to the active connection so tenant info from a previous
 *  server/identity is never served after the token or API URL changes. */
export const tenantInfoQueryKey = (apiBaseUrl: string | null) => ['tenantInfo', { apiBaseUrl }] as const;

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
 * Loads the current tenant's profile (name, website, logo) from /chat/graphql
 * for the welcome screen. `data` is `null` when no record exists yet. Waits for
 * the token/API URL to be available; readiness is recomputed on every token/API
 * update, and the cache is keyed by the API base URL so a connection change
 * refetches instead of serving a stale organization.
 */
export function useTenantInfoQuery({ enabled }: { enabled: boolean }) {
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

  return useQuery<TenantInfo | null>({
    queryKey: tenantInfoQueryKey(connection.apiBaseUrl),
    queryFn: () => tenantInfoService.fetchTenantInfo(),
    enabled: enabled && connection.isReady,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
