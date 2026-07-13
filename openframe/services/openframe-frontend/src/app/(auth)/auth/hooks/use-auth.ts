'use client';

import { useLocalStorage, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';
import { nativeLogin } from '@/lib/native-login';
import { unregisterNativePush } from '@/lib/native-push';
import { isNativeShell } from '@/lib/native-shell';
import { routes } from '@/lib/routes';
import { runtimeEnv } from '@/lib/runtime-config';
import { isBearerAuthMode } from '@/lib/token-store';
import { AUTH_ERROR_CODE } from '../constants/auth-error-codes';
import { useAuthStore } from '../stores/auth-store';
import { authSessionQueryKey } from './use-auth-session';
import { useTokenStorage } from './use-token-storage';

interface TenantInfo {
  tenantId?: string;
  tenantName: string;
  tenantDomain: string;
}

export interface TenantDiscoveryResponse {
  email: string;
  has_existing_accounts: boolean;
  tenant_id?: string | null;
  auth_providers?: string[] | null;
  domain?: string | null;
}

interface RegisterRequest {
  tenantName: string;
  tenantDomain: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface SsoRegisterRequest {
  tenantName: string;
  tenantDomain: string;
  email: string;
  provider: 'google' | 'microsoft';
  redirectTo?: string;
}

/**
 * Auth actions hook - provides login, registration, and logout functions.
 * Does NOT perform auth checking. Use `useAuthSession` for that.
 */
export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { setTenantId } = useAuthStore();
  const { clearTokens } = useTokenStorage();

  const [email, setEmail] = useLocalStorage('auth:email', '');
  const [tenantInfo, setTenantInfo] = useLocalStorage<TenantInfo | null>('auth:tenantInfo', null);
  const [hasDiscoveredTenants, setHasDiscoveredTenants] = useLocalStorage('auth:hasDiscoveredTenants', false);
  const [availableProviders, setAvailableProviders] = useLocalStorage<string[]>('auth:availableProviders', []);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [discoveryAttempted, setDiscoveryAttempted] = useState(false);

  // Track when localStorage hooks are initialized
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  /**
   * Trigger a recheck of auth session via React Query invalidation.
   * Call this after successful login/registration to update auth state.
   */
  const triggerAuthRecheck = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: authSessionQueryKey });
  }, [queryClient]);

  const discoverTenants = async (userEmail: string): Promise<TenantDiscoveryResponse | null> => {
    setIsLoading(true);

    if (userEmail !== email) {
      setDiscoveryAttempted(false);
      setHasDiscoveredTenants(false);
      setTenantInfo(null);
      setAvailableProviders([]);
    }

    setEmail(userEmail);

    try {
      const response = await authApiClient.discoverTenants(userEmail);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data as TenantDiscoveryResponse;

      if (data.has_existing_accounts && data.tenant_id) {
        const tenantInfo = {
          tenantId: data.tenant_id,
          tenantName: '',
          tenantDomain: data.domain || 'localhost',
        };
        const providers = data.auth_providers || ['openframe-sso'];

        setTenantInfo(tenantInfo);
        setAvailableProviders(providers);
        setHasDiscoveredTenants(true);
        setTenantId(data.tenant_id);
      } else {
        setHasDiscoveredTenants(false);
      }

      setDiscoveryAttempted(true);
      return data;
    } catch (error) {
      toast({
        title: 'Discovery Failed',
        description: error instanceof Error ? error.message : 'Unable to check for existing accounts',
        variant: 'destructive',
      });
      setHasDiscoveredTenants(false);
      setDiscoveryAttempted(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const registerOrganization = async (data: RegisterRequest) => {
    setIsLoading(true);

    try {
      const response = await authApiClient.registerOrganization({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        tenantName: data.tenantName,
        tenantDomain: data.tenantDomain || 'localhost',
      });

      if (!response.ok) {
        const code = (response.data as any)?.code;
        const message = (response.data as any)?.message || response.error || 'Registration failed';
        let userMessage = 'Registration failed';
        let title = 'Registration Failed';
        const variant: any = 'destructive';

        switch (code) {
          case AUTH_ERROR_CODE.TENANT_REGISTRATION_BLOCKED:
            title = 'Service Unavailable';
            userMessage = 'Registration is temporarily unavailable. Please try again later.';
            break;
          default:
            userMessage = message;
        }

        toast({ title, description: userMessage, variant });
        throw new Error(userMessage);
      }

      toast({
        title: 'Success!',
        description: 'Organization created successfully. You can now sign in.',
        variant: 'success',
      });

      const discoveryResult = await discoverTenants(data.email);

      if (discoveryResult && discoveryResult.has_existing_accounts) {
        window.location.href = '/auth/login';
      } else {
        window.location.href = '/auth';
      }
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Unable to create organization',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const registerOrganizationSso = async (data: SsoRegisterRequest) => {
    setIsLoading(true);

    try {
      await authApiClient.registerOrganizationSso(data);
      return true;
    } catch (error: any) {
      toast({
        title: 'SSO Registration Failed',
        description: error instanceof Error ? error.message : 'Unable to register organization with SSO',
        variant: 'destructive',
      });
      setIsLoading(false);
      return false;
    }
  };

  const loginWithSso = async (provider: string) => {
    setIsLoading(true);

    try {
      if (tenantInfo?.tenantId) {
        setTenantId(tenantInfo.tenantId);

        if (isNativeShell()) {
          const { tenantHostChanged } = await nativeLogin({
            tenantId: tenantInfo.tenantId,
            provider,
            tenantDomain: tenantInfo.tenantDomain !== 'localhost' ? tenantInfo.tenantDomain : undefined,
          });
          if (tenantHostChanged) {
            window.location.assign('/dashboard');
            return;
          }
          triggerAuthRecheck();
          router.push(routes.dashboard);
          setIsLoading(false);
          return;
        }

        const getReturnUrl = () => {
          const hostname = window.location.hostname;
          const protocol = window.location.protocol;
          const port = window.location.port ? `:${window.location.port}` : '';
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}${port}/dashboard`;
          }
          return `${window.location.origin}/dashboard`;
        };

        const returnUrl = encodeURIComponent(getReturnUrl());
        const loginUrl = authApiClient.loginUrl(tenantInfo.tenantId, returnUrl, provider);
        window.location.href = loginUrl;
      } else {
        throw new Error('No tenant information available for SSO login');
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Unable to sign in with SSO',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    const { tenantId: storeTenantId, user: currentUser } = useAuthStore.getState();
    const effectiveTenantId =
      storeTenantId || currentUser?.tenantId || currentUser?.organizationId || tenantInfo?.tenantId;

    // In the native shell revoke server-side BEFORE clearing local tokens —
    // logoutAsync needs the stored refresh token to send the Refresh-Token header,
    // and the push-token DELETE is an authenticated call.
    if (isNativeShell()) {
      try {
        await unregisterNativePush();
      } catch {
        // Best-effort; the backend also prunes tokens on APNs rejections.
      }
      try {
        await authApiClient.logoutAsync(effectiveTenantId);
      } catch {
        // Best-effort revocation; local sign-out proceeds regardless.
      }
    }

    const { logout: storeLogout } = useAuthStore.getState();
    storeLogout();

    // Clear React Query auth cache
    queryClient.removeQueries({ queryKey: authSessionQueryKey });

    if (isBearerAuthMode()) {
      await clearTokens();
    }

    setEmail('');
    setTenantInfo(null);
    setHasDiscoveredTenants(false);
    setDiscoveryAttempted(false);
    setAvailableProviders([]);
    setIsLoading(false);

    if (isNativeShell()) {
      // No browser redirect in the shell — the route guard shows the sign-in screen.
      return;
    }

    if (effectiveTenantId) {
      authApiClient.logout(effectiveTenantId);
    } else {
      // After an explicit logout the user goes straight to the Login tab.
      const sharedHostUrl = runtimeEnv.sharedHostUrl();
      window.location.href = `${sharedHostUrl}/auth/login`;
    }
  }, [clearTokens, setEmail, setTenantInfo, setHasDiscoveredTenants, setAvailableProviders, tenantInfo, queryClient]);

  const reset = () => {
    setEmail('');
    setTenantInfo(null);
    setHasDiscoveredTenants(false);
    setDiscoveryAttempted(false);
    setIsLoading(false);
  };

  return {
    email,
    tenantInfo,
    hasDiscoveredTenants,
    discoveryAttempted,
    availableProviders,
    isLoading,
    isInitialized,
    discoverTenants,
    registerOrganization,
    registerOrganizationSso,
    loginWithSso,
    logout,
    reset,
    triggerAuthRecheck,
  };
}
