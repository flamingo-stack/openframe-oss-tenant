export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
}

const ACCESS_KEY = 'of_access_token';
const REFRESH_KEY = 'of_refresh_token';

export function setTokens(tokens: StoredTokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

