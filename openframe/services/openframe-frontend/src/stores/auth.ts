import { create } from 'zustand'

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface AuthState {
  isAuthenticated: boolean;
  authStatusCache: boolean | null;
  
  // Actions
  updateAuthStatus: () => void;
  checkAuthStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<TokenResponse>;
  tryRefreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  startGoogleOAuth: () => void;
}

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  authStatusCache: null,
  
  updateAuthStatus: () => {
    // Check if we have the access_token cookie (indicates active session)
    const hasAccessTokenCookie = document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('access_token='));
    
    // If no cookie, definitely not authenticated
    if (!hasAccessTokenCookie) {
      set({ isAuthenticated: false });
      return;
    }
    
    // If we have cookie and cached status, use cached
    const state = get();
    if (state.authStatusCache !== null) {
      set({ isAuthenticated: state.authStatusCache });
      return;
    }
    
    // If we have cookie but no cached status, assume authenticated
    set({ isAuthenticated: true });
  },
  
  checkAuthStatus: async () => {
    try {
      console.log('🔍 [Auth] Checking authentication status via server...');
      
      const response = await fetch(`${getApiUrl()}/oauth/me`, {
        method: 'GET',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ [Auth] Authentication status: authenticated');
        set({ authStatusCache: true, isAuthenticated: true });
        return true;
      } else {
        console.log('❌ [Auth] Authentication status: not authenticated');
        set({ authStatusCache: false, isAuthenticated: false });
        return false;
      }
    } catch (error) {
      console.error('❌ [Auth] Error checking auth status:', error);
      set({ authStatusCache: false, isAuthenticated: false });
      return false;
    }
  },
  
  login: async (email: string, password: string): Promise<TokenResponse> => {
    try {
      const clientId = import.meta.env.VITE_CLIENT_ID || 'openframe-ui';
      const clientSecret = import.meta.env.VITE_CLIENT_SECRET || 'openframe-ui-secret';
      
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', email);
      params.append('password', password);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('scope', 'read write');
      
      const response = await fetch(`${getApiUrl()}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }
      
      const tokenData = await response.json();
      
      // Update auth status after successful login
      set({ isAuthenticated: true, authStatusCache: true });
      
      return tokenData;
    } catch (error) {
      console.error('❌ [Auth] Login failed:', error);
      throw error;
    }
  },
  
  register: async (email: string, password: string, firstName: string, lastName: string): Promise<TokenResponse> => {
    try {
      const clientId = import.meta.env.VITE_CLIENT_ID || 'openframe-ui';
      const clientSecret = import.meta.env.VITE_CLIENT_SECRET || 'openframe-ui-secret';
      const credentials = btoa(`${clientId}:${clientSecret}`);
      
      const response = await fetch(`${getApiUrl()}/oauth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.error_description) {
          throw new Error(data.error_description);
        } else if (data.message) {
          throw new Error(data.message);
        } else if (data.error) {
          throw new Error('Registration failed');
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }
      
      const tokenData = await response.json();
      
      // Update auth status after successful registration
      set({ isAuthenticated: true, authStatusCache: true });
      
      return tokenData;
    } catch (error) {
      console.error('❌ [Auth] Registration failed:', error);
      set({ authStatusCache: false, isAuthenticated: false });
      throw error;
    }
  },
  
  tryRefreshToken: async (): Promise<boolean> => {
    try {
      console.log('🔄 [Auth] Attempting token refresh via HTTP-only cookies...');
      
      const response = await fetch(`${getApiUrl()}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token'
        }).toString(),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('✅ [Auth] Token refresh successful');
        set({ isAuthenticated: true, authStatusCache: true });
        return true;
      } else {
        console.log('❌ [Auth] Token refresh failed');
        set({ isAuthenticated: false, authStatusCache: false });
        return false;
      }
    } catch (error) {
      console.error('❌ [Auth] Token refresh error:', error);
      set({ isAuthenticated: false, authStatusCache: false });
      return false;
    }
  },
  
  logout: async (): Promise<void> => {
    try {
      console.log('🔑 [Auth] Logging out...');
      
      await fetch(`${getApiUrl()}/oauth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear auth state
      set({ 
        isAuthenticated: false, 
        authStatusCache: false 
      });
      
      console.log('✅ [Auth] Logout successful');
    } catch (error) {
      console.error('❌ [Auth] Logout error:', error);
      // Still clear auth state even if logout request fails
      set({ 
        isAuthenticated: false, 
        authStatusCache: false 
      });
    }
  },
  
  startGoogleOAuth: () => {
    const clientId = import.meta.env.VITE_CLIENT_ID || 'openframe-ui';
    const redirectUri = `${window.location.origin}/oauth2/callback/google`;
    const baseUrl = getApiUrl();
    
    console.log('🔑 [Auth] Starting Google OAuth flow');
    console.log('🔑 [Auth] Redirect URI:', redirectUri);
    
    const oauthUrl = `${baseUrl}/oauth2/authorization/google?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=read%20write`;
    
    console.log('🔑 [Auth] OAuth URL:', oauthUrl);
    window.location.href = oauthUrl;
  }
}));

// Initialize auth status on store creation
useAuthStore.getState().updateAuthStatus();