import React, { createContext, useContext, useEffect } from 'react'
import { create } from 'zustand'

// Types based on the existing Vue auth store
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
  updateAuthStatus: () => void;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<TokenResponse>;
  tryRefreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  handleAuthError: (error: unknown) => Promise<boolean>;
}

// Configuration service (simplified version of the Vue ConfigService)
const getConfig = () => ({
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  clientId: import.meta.env.VITE_CLIENT_ID || 'openframe-ui',
  clientSecret: import.meta.env.VITE_CLIENT_SECRET || 'openframe-ui-secret'
});

// Zustand store to replace the Vue Pinia store
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  authStatusCache: null,

  updateAuthStatus: () => {
    // Check if we have the access_token cookie (indicates active session)
    const hasAccessTokenCookie = document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('access_token='));
    
    if (!hasAccessTokenCookie) {
      set({ isAuthenticated: false });
      return;
    }
    
    const { authStatusCache } = get();
    if (authStatusCache !== null) {
      set({ isAuthenticated: authStatusCache });
      return;
    }
    
    // If we have cookie but no cached status, assume authenticated
    set({ isAuthenticated: true });
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const config = getConfig();
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email);
      formData.append('password', password);
      formData.append('client_id', config.clientId);
      formData.append('client_secret', config.clientSecret);
      formData.append('scope', 'openid profile email');

      const response = await fetch(`${config.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include', // Include cookies for authentication
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Login failed');
      }

      console.log('🔑 [AuthStore] Login successful, tokens set via HTTP-only cookies');
      set({ authStatusCache: true });
      get().updateAuthStatus();
      
      return data;
    } catch (error) {
      localStorage.removeItem('is_refreshing');
      set({ authStatusCache: false });
      get().updateAuthStatus();
      throw error;
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string): Promise<TokenResponse> => {
    try {
      const config = getConfig();
      const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
      const apiUrl = `${config.apiUrl}/oauth/register`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error_description) {
          throw new Error(data.error_description);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      console.log('🔑 [AuthStore] Registration successful, tokens set via HTTP-only cookies');
      set({ authStatusCache: true });
      get().updateAuthStatus();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      set({ authStatusCache: false });
      get().updateAuthStatus();
      throw error;
    }
  },

  tryRefreshToken: async (): Promise<boolean> => {
    try {
      console.log('🔄 [AuthStore] Attempting token refresh via HttpOnly cookies...');
      
      const config = getConfig();
      const response = await fetch(`${config.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include',
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      });

      if (response.ok) {
        console.log('✅ [AuthStore] Token refresh successful - new tokens set as HttpOnly cookies');
        set({ authStatusCache: true });
        get().updateAuthStatus();
        return true;
      } else {
        console.log('❌ [AuthStore] Token refresh failed:', response.status);
        set({ authStatusCache: false });
        get().updateAuthStatus();
        return false;
      }
    } catch (error) {
      console.error('❌ [AuthStore] Token refresh error:', error);
      set({ authStatusCache: false });
      get().updateAuthStatus();
      return false;
    }
  },

  logout: async () => {
    try {
      const config = getConfig();
      const response = await fetch(`${config.apiUrl}/oauth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('⚠️ [AuthStore] Logout endpoint failed, continuing with local logout');
      }
    } catch (error) {
      console.warn('⚠️ [AuthStore] Logout request failed:', error);
    }
    
    // Clear any localStorage remnants and update cached status
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ authStatusCache: false });
    get().updateAuthStatus();
    console.log('🔑 [AuthStore] Logged out and cleared HttpOnly cookies');
  },

  checkAuthStatus: async (): Promise<boolean> => {
    const config = getConfig();
    const fullUrl = `${config.apiUrl}/oauth/me`;
    
    console.log('🔑 [AuthStore] Checking auth status...');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        credentials: 'include'
      });
      
      const authenticated = response.ok;
      set({ authStatusCache: authenticated });
      get().updateAuthStatus();
      console.log('🔑 [AuthStore] Auth status checked via server:', authenticated);
      return authenticated;
    } catch (error) {
      console.error('🔑 [AuthStore] Auth check failed with error:', error);
      set({ authStatusCache: false });
      get().updateAuthStatus();
      return false;
    }
  },

  handleAuthError: async (error: unknown): Promise<boolean> => {
    console.log('🔑 [AuthStore] Handling auth error:', error);
    
    if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('token expired') || 
        error.message.includes('Unauthorized')
    )) {
      console.log('🔑 [AuthStore] Attempting token refresh due to 401/expired token');
      try {
        const success = await get().tryRefreshToken();
        if (success) {
          console.log('🔑 [AuthStore] Token refresh successful');
          return true;
        } else {
          console.log('🔑 [AuthStore] Token refresh failed, logging out');
          await get().logout();
          return false;
        }
      } catch (refreshError) {
        console.error('🔑 [AuthStore] Token refresh error:', refreshError);
        await get().logout();
        return false;
      }
    }
    
    console.log('🔑 [AuthStore] Non-auth error, not attempting refresh');
    return false;
  }
}));

// Initialize auth status on store creation - moved to AuthProvider to prevent double initialization

// React Context for easier usage in components
const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize auth status when provider mounts - only run once
    authStore.updateAuthStatus();
  }, []); // Remove authStore dependency to prevent infinite loop

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};