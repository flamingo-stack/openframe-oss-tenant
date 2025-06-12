/**
 * Utility functions for OAuth 2.0 with PKCE support
 */

/**
 * Generate a random string for PKCE code_verifier
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => String.fromCharCode(byte))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length);
}

/**
 * Generate code_verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return generateRandomString(128);
}

/**
 * Generate code_challenge from code_verifier using SHA256
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Store OAuth parameters in session storage
 */
export function storeOAuthState(state: string, codeVerifier: string, redirectUri: string): void {
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);
}

/**
 * Retrieve OAuth parameters from session storage
 */
export function getOAuthState(): {
  state: string | null;
  codeVerifier: string | null;
  redirectUri: string | null;
} {
  return {
    state: sessionStorage.getItem('oauth_state'),
    codeVerifier: sessionStorage.getItem('oauth_code_verifier'),
    redirectUri: sessionStorage.getItem('oauth_redirect_uri')
  };
}

/**
 * Clear OAuth parameters from session storage
 */
export function clearOAuthState(): void {
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_redirect_uri');
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParams = new URL(url).searchParams;
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
} 