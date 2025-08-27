import { getAccessToken, setTokens, getRefreshToken } from '@/services/token-storage';
import { ConfigService } from '@/config/config.service';

const config = ConfigService.getInstance();

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // Build full URL with proper base similar to restClient
  let url = typeof input === 'string' ? input : (input as URL).toString();
  let baseUrl: string;
  if (url.startsWith('/oauth/')) {
    baseUrl = config.getConfig().gatewayUrl;
  } else if (
    url.startsWith('/register') ||
    url.startsWith('/oauth2/') ||
    url.startsWith('/tenant/') ||
    url.startsWith('/oauth/') ||
    url.startsWith('/sas/')
  ) {
    baseUrl = config.getConfig().gatewayUrl;
    if (url.startsWith('/tenant/') || url.startsWith('/oauth2/') || url.startsWith('/register')) {
      url = `/sas${url}`;
    }
  } else {
    baseUrl = config.getConfig().apiUrl;
  }

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  // Inject dev access_token header if present (not for refresh endpoint)
  const token = getAccessToken();
  const headers: HeadersInit = {
    ...(init.headers || {}),
  } as HeadersInit;
  const isRefreshEndpoint = fullUrl.includes('/oauth/refresh');
  if (token && !isRefreshEndpoint) {
    (headers as any)['Access-Token'] = token;
  }

  // Add refresh_token header only for refresh endpoint (dev support)
  if (isRefreshEndpoint) {
    const rt = getRefreshToken();
    if (rt) {
      (headers as any)['Refresh-Token'] = rt;
    }
  }

  const response = await fetch(fullUrl, {
    ...init,
    headers,
    credentials: 'include'
  });

  // If backend sent tokens as headers (localhost dev), capture and persist
  const devAccess = response.headers.get('Access-Token') || response.headers.get('access_token');
  const devRefresh = response.headers.get('Refresh-Token') || response.headers.get('refresh_token');
  if (devAccess) {
    setTokens({ accessToken: devAccess, refreshToken: devRefresh || undefined });
  }

  return response;
}


