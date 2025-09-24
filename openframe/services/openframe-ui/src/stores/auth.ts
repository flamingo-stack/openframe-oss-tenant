import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '@/services/AuthService';
import { clearTokens } from '@/services/token-storage';

export const useAuthStore = defineStore('auth', () => {
  const authStatusCache = ref<boolean | null>(null);
  const isAuthenticated = ref(false);
  const currentTenantId = ref<string | null>(null);

  // Initialize from session storage
  const storedTenantId = authService.getCurrentTenantId();
  if (storedTenantId) {
    currentTenantId.value = storedTenantId;
    console.log('🔧 [AuthStore] Restored tenant ID from session storage:', storedTenantId);
  }

  async function updateAuthStatus(): Promise<boolean> {
    try {
      // If devTicket is present in URL, exchange for tokens (localhost dev)
      try {
        const url = new URL(window.location.href);
        const ticket = url.searchParams.get('devTicket');
        if (ticket) {
          await (await import('@/apollo/apolloClient')).restClient.get(`/oauth/dev-exchange?ticket=${encodeURIComponent(ticket)}`);
          url.searchParams.delete('devTicket');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch {}

      // Rely on backend truth: /me (base URL already includes /api)
      const me = await (await import('@/apollo/apolloClient')).restClient.get('/me');
      const ok = !!me;
      isAuthenticated.value = ok;
      authStatusCache.value = ok;
      // Persist tenantId from backend truth so logout/refresh always have it
      try {
        const anyMe = me as any;
        const meTenantId = anyMe?.user?.tenantId || anyMe?.tenantId;
        if (meTenantId && typeof meTenantId === 'string') {
          currentTenantId.value = meTenantId;
          authService.setCurrentTenantId(meTenantId);
          sessionStorage.setItem('currentTenantId', meTenantId);
        }
      } catch {}
      console.log('✅ [AuthStore] Auth verified via /api/me:', ok);
      return ok;
    } catch (e: any) {
      isAuthenticated.value = false;
      authStatusCache.value = false;
      console.log('❌ [AuthStore] /api/me indicates not authenticated');
      return false;
    }
  }

  function login(tenantId: string) {
    console.log('🔑 [AuthStore] Login initiated for tenant:', tenantId);
    currentTenantId.value = tenantId;
    authService.setCurrentTenantId(tenantId);
    authService.login(tenantId);
  }

  async function refreshToken() {
    const tenantId = currentTenantId.value
      || authService.getCurrentTenantId()
      || sessionStorage.getItem('auth:tenant_id');
    if (!tenantId) {
      throw new Error('No tenant ID available for token refresh');
    }

    console.log('🔄 [AuthStore] Refreshing token for tenant:', tenantId);
    try {
      await authService.refreshToken(tenantId);
      updateAuthStatus();
      console.log('✅ [AuthStore] Token refresh successful');
    } catch (error) {
      console.error('❌ [AuthStore] Token refresh failed:', error);
      // Do not auto-logout here to avoid refresh/logout loops.
      // Mark unauthenticated and redirect to login once; UI will handle further navigation.
      isAuthenticated.value = false;
      // Optional: navigate to auth page once
      if (typeof window !== 'undefined' && window.location.pathname !== '/central-auth-demo') {
        window.location.href = '/central-auth-demo?reauth=1';
      }
    }
  }

  async function logout() {
    console.log('🚪 [AuthStore] Logout initiated');
    // Resolve tenantId with fallbacks
    const stored = currentTenantId.value
      || authService.getCurrentTenantId()
      || sessionStorage.getItem('currentTenantId');

    if (stored && stored.length > 0) {
      const url = `/oauth/logout?tenantId=${encodeURIComponent(stored)}`;
      console.log('🚪 [AuthStore] Calling Gateway logout (XHR):', url);
      try {
        // Perform logout request first
        await (await import('@/apollo/apolloClient')).restClient.get(url, {
          headers: { 'x-no-refresh': '1' }
        });
      } catch (e) {
        console.warn('⚠️ [AuthStore] Logout request failed (continuing with client cleanup):', e);
      } finally {
        // Clear local state after server logout
        isAuthenticated.value = false;
        currentTenantId.value = null;
        authService.setCurrentTenantId('');
        sessionStorage.removeItem('currentTenantId');
        try { clearTokens(); } catch {}
        console.log('🧹 [AuthStore] Local state cleared');
        // Redirect away from protected area
        window.location.replace('/central-auth-demo');
      }
    } else {
      console.warn('⚠️ [AuthStore] Missing tenantId for logout; attempting redirect without it');
      // As a last resort, clean locally and navigate home; backend cannot logout without tenant
      isAuthenticated.value = false;
      currentTenantId.value = null;
      authService.setCurrentTenantId('');
      sessionStorage.removeItem('currentTenantId');
      try { clearTokens(); } catch {}
      window.location.href = '/';
    }
  }

  // Update auth status when cookies change
  if (typeof window !== 'undefined') {
      // Listen for storage events (when cookies change)
  window.addEventListener('storage', () => {
    console.log('📦 [AuthStore] Storage event detected, updating auth status');
    updateAuthStatus();
  });
    
    // Initial check (await ignored intentionally)
    updateAuthStatus();
    
    // Log initial state
    console.log('🚀 [AuthStore] Initialized with:', {
      isAuthenticated: isAuthenticated.value,
      currentTenantId: currentTenantId.value
    });
  }

  return {
    isAuthenticated,
    currentTenantId,
    login,
    logout,
    refreshToken,
    updateAuthStatus
  };
});