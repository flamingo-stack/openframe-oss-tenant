export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  state?: string;
}

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleTokenRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
} 