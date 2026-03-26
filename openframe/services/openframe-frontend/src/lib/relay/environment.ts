'use client';

import type { FetchFunction, IEnvironment } from 'relay-runtime';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';
import { forceLogout } from '../force-logout';
import { runtimeEnv } from '../runtime-config';
import { isTokenRefreshing, refreshAccessToken } from '../token-refresh-manager';

const ACCESS_TOKEN_KEY = 'of_access_token';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch {
      // localStorage not available
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
  }

  return json;
};

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
    });
  }

  if (!relayEnvironment) {
    relayEnvironment = new Environment({
      network: Network.create(fetchRelay),
      store: new Store(new RecordSource(), {
        gcReleaseBufferSize: 10,
      }),
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
