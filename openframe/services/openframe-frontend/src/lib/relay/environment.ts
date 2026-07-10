'use client';

import type { FetchFunction, IEnvironment } from 'relay-runtime';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';
import { forceLogout } from '../force-logout';
import { runtimeEnv } from '../runtime-config';
import { detectTrialExpiredFromGraphqlErrors } from '../subscription-lock-signal';
import { isTokenRefreshing, refreshAccessToken } from '../token-refresh-manager';
import { getAccessTokenSync, isBearerAuthMode } from '../token-store';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isBearerAuthMode()) {
    const accessToken = getAccessTokenSync();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return headers;
}

function getGraphqlUrl(): string {
  const tenantHost = runtimeEnv.tenantHostUrl();
  const baseUrl = tenantHost || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}/api/graphql`;
}

async function executeFetch(
  request: Parameters<FetchFunction>[0],
  variables: Parameters<FetchFunction>[1],
  headers: Record<string, string>,
): Promise<Response> {
  return fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  });
}

/**
 * Relay network fetch function.
 * Mirrors apiClient auth logic: cookie-based auth + 401 token refresh + force logout.
 */
const fetchRelay: FetchFunction = async (request, variables) => {
  const headers = getAuthHeaders();
  let response = await executeFetch(request, variables, headers);

  // --- 401 handling: token refresh, then retry once ---
  if (response.status === 401) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath.startsWith('/auth')) {
      throw new Error('Unauthorized');
    }

    // If another refresh is in-flight, wait for it
    if (isTokenRefreshing()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await executeFetch(request, variables, getAuthHeaders());
      } else {
        await forceLogout({ reason: 'Relay - token refresh failed' });
        throw new Error('Authentication failed');
      }
    } else {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await executeFetch(request, variables, getAuthHeaders());
      } else {
        await forceLogout({ reason: 'Relay - token refresh failed' });
        throw new Error('Authentication failed');
      }
    }
  }

  if (!response.ok) {
    throw new Error(`Relay fetch failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('[Relay] GraphQL errors:', json.errors);
    detectTrialExpiredFromGraphqlErrors(json.errors);
  }

  return json;
};

/**
 * Custom record-id resolution for normalization.
 *
 * `SubscriptionOptionDetail.id` is documented as a "stable unique identifier for
 * Relay normalization" but the backend can emit several options that share the
 * same composite id (its slot disambiguation is buggy — e.g. an EXPIRED, an
 * ACTIVE and a PENDING_ACTIVATION option all collapse to `...:<date>#1`). Relay
 * would normalize those into a single record (last-write-wins), silently
 * dropping the ACTIVE option so the current-plan view falls back to PAYG.
 *
 * Returning `undefined` for this type opts it out of global normalization: Relay
 * stores each list entry under a parent-scoped client id (by field + index)
 * instead, so colliding backend ids no longer merge. Safe because these options
 * are never fetched via `node(id:)` and are only read inline through their
 * parent subscription/product. Everything else keeps the default id-based
 * normalization.
 */
function resolveDataId(value: { readonly id?: unknown }, typeName: string): string | undefined {
  if (typeName === 'SubscriptionOptionDetail') return undefined;
  return typeof value.id === 'string' ? value.id : undefined;
}

let relayEnvironment: IEnvironment | null = null;

/**
 * Get or create the singleton Relay Environment.
 */
export function getRelayEnvironment(): IEnvironment {
  if (typeof window === 'undefined') {
    return new Environment({
      network: Network.create(fetchRelay),
      store: new Store(new RecordSource()),
      isServer: true,
      // biome-ignore lint/style/useNamingConvention: Relay's Environment option key is fixed.
      getDataID: resolveDataId,
    });
  }

  if (!relayEnvironment) {
    const store = new Store(new RecordSource(), {
      gcReleaseBufferSize: 20,
      queryCacheExpirationTime: 5 * 60 * 1000,
    });
    relayEnvironment = new Environment({
      network: Network.create(fetchRelay),
      store,
      // biome-ignore lint/style/useNamingConvention: Relay's Environment option key is fixed.
      getDataID: resolveDataId,
    });
  }

  return relayEnvironment;
}

/**
 * Reset the Relay environment (useful for logout/auth changes).
 */
export function resetRelayEnvironment(): void {
  relayEnvironment = null;
}
