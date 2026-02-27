'use client';

import { useLocalStorage, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { isSaasSharedMode } from '@/lib/app-mode';
import { authApiClient } from '@/lib/auth-api-client';
import { clearStoredTokens } from '@/lib/force-logout';
import { runtimeEnv } from '@/lib/runtime-config';
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
}

interface RegisterRequest {
  tenantName: string;
  tenantDomain: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accessCode: string;
}

interface SsoRegisterRequest {
  tenantName: string;
  tenantDomain: string;
  email: string;
  provider: 'google' | 'microsoft';
  accessCode: string;
  redirectTo?: string;
}

/**
 * Auth actions hook - provides login, registration, and logout functions.
 * Does NOT perform auth checking. Use `useAuthSession` for that.
 */
export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          tenantDomain: 'localhost',
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
        accessCode: isSaasSharedMode() ? data.accessCode : undefined,
      });

      if (!response.ok) {
        const code = (response.data as any)?.code;
        const message = (response.data as any)?.message || response.error || 'Registration failed';
        let userMessage = 'Registration failed';
        let title = 'Registration Failed';
        const variant: any = 'destructive';

        switch (code) {
          case 'INVALID_ARGUMENT':
            userMessage = 'Access code is required';
            break;
          case 'INVALID_ACCESS_CODE':
            userMessage = 'The access code you entered is invalid. Please check and try again.';
            break;
          case 'ACCESS_CODE_ALREADY_USED':
            userMessage = 'This access code has already been used. Please contact support for a new code.';
            break;
          case 'ACCESS_CODE_VALIDATION_FAILED':
            userMessage = 'Unable to verify access code. Please try again in a moment.';
            break;
          case 'TENANT_REGISTRATION_BLOCKED':
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

  const logout = useCallback(() => {
    const { tenantId: storeTenantId, user: currentUser } = useAuthStore.getState();
    const effectiveTenantId =
      storeTenantId || currentUser?.tenantId || currentUser?.organizationId || tenantInfo?.tenantId;

    const { logout: storeLogout } = useAuthStore.getState();
    storeLogout();

    // Clear React Query auth cache
    queryClient.removeQueries({ queryKey: authSessionQueryKey });

    const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
    if (isDevTicketEnabled) {
      clearTokens();
    }

    setEmail('');
    setTenantInfo(null);
    setHasDiscoveredTenants(false);
    setDiscoveryAttempted(false);
    setAvailableProviders([]);
    setIsLoading(false);

    if (effectiveTenantId) {
      authApiClient.logout(effectiveTenantId);
    } else {
      const sharedHostUrl = runtimeEnv.sharedHostUrl();
      window.location.href = `${sharedHostUrl}/auth`;
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
