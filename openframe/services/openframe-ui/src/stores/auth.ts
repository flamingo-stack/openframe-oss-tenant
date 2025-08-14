import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '@/services/AuthService';

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
      // Rely on backend truth: /me (base URL already includes /api)
      const me = await (await import('@/apollo/apolloClient')).restClient.get('/me');
      const ok = !!me;
      isAuthenticated.value = ok;
      authStatusCache.value = ok;
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
    if (!currentTenantId.value) {
      throw new Error('No tenant ID available for token refresh');
    }

    console.log('🔄 [AuthStore] Refreshing token for tenant:', currentTenantId.value);
    try {
      await authService.refreshToken(currentTenantId.value);
      updateAuthStatus();
      console.log('✅ [AuthStore] Token refresh successful');
    } catch (error) {
      console.error('❌ [AuthStore] Token refresh failed:', error);
      logout();
    }
  }

  function logout() {
    console.log('🚪 [AuthStore] Logout initiated');
    // Resolve tenantId with fallbacks
    const stored = currentTenantId.value
      || authService.getCurrentTenantId()
      || sessionStorage.getItem('auth:tenant_id');

    if (stored && stored.length > 0) {
      authService.logout(stored);
    } else {
      console.warn('⚠️ [AuthStore] Missing tenantId for logout; attempting redirect without it');
      // As a last resort, navigate to homepage; backend cannot logout without tenant
      window.location.href = '/';
    }

    // Clear local state immediately
    isAuthenticated.value = false;
    currentTenantId.value = null;
    authService.setCurrentTenantId('');
    sessionStorage.removeItem('currentTenantId');
    console.log('🧹 [AuthStore] Local state cleared');
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