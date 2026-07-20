import { useQuery } from '@tanstack/react-query';
import { fetchHubDefaultQuickActions, type HubQuickAction } from '../services/hubQuickActionsService';
import { useApiConnectionState } from './useAiSettingsQuery';

/** Cache key scoped to the active connection, like `aiSettingsQueryKey`. */
export const hubQuickActionsQueryKey = (apiBaseUrl: string | null) => ['hubQuickActions', { apiBaseUrl }] as const;

/**
 * OpenFrame default quick actions for the Fae chat, from the Product Hub via
 * the gateway proxy. Fetched only while the tenant config says defaults apply
 * (`quickActionsIsDefault`), which the caller expresses through `enabled`.
 */
export function useHubQuickActionsQuery({ enabled }: { enabled: boolean }) {
  const connection = useApiConnectionState();

  return useQuery<HubQuickAction[]>({
    queryKey: hubQuickActionsQueryKey(connection.apiBaseUrl),
    queryFn: fetchHubDefaultQuickActions,
    enabled: enabled && connection.isReady,
    retry: 1,
    // The hub set changes rarely; refresh on refocus like the AI settings do.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
