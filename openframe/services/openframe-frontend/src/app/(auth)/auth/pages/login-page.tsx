'use client';

import { AuthShell, type AuthSsoProvider } from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginSection } from '@/app/(auth)/auth/components/login-form-section';
import { AuthLoginSection } from '@/app/(auth)/auth/components/login-section';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { AuthLayout } from '@/app/(auth)/auth/layouts';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { isAuthOnlyMode, isSaasSharedMode } from '@/lib/app-mode';

const AUTH_MOBILE_TAGLINE = (
  <>
    <p>All your MSP ops in one place.</p>
    <p>Open-source, AI-ready, no vendor tax.</p>
  </>
);

// Backend provider id ↔ LoginForm provider id
const SSO_TO_FORM: Record<string, AuthSsoProvider> = {
  'openframe-sso': 'openframe',
  google: 'google',
  microsoft: 'microsoft',
};
const FORM_TO_SSO: Record<AuthSsoProvider, string> = {
  openframe: 'openframe-sso',
  google: 'google',
  microsoft: 'microsoft',
};
const FORM_PROVIDER_ORDER: AuthSsoProvider[] = ['openframe', 'google', 'microsoft'];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const {
    email,
    tenantInfo,
    hasDiscoveredTenants,
    discoveryAttempted,
    availableProviders,
    isLoading,
    isInitialized,
    loginWithSso,
    discoverTenants,
  } = useAuth();

  const saasShared = isSaasSharedMode();

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // saas-shared keeps the legacy flow: auto-discover from the stored email, bounce back if none.
  useEffect(() => {
    if (!saasShared || !isInitialized) return;

    if (email && !discoveryAttempted && !isLoading) {
      discoverTenants(email);
    } else if (!email && !isLoading) {
      router.push('/auth');
    }
  }, [saasShared, email, discoveryAttempted, isLoading, isInitialized, discoverTenants, router]);

  const handleBack = useSafeBack('/auth/');

  if (saasShared) {
    return (
      <AuthLayout>
        <AuthLoginSection
          email={email}
          tenantInfo={tenantInfo}
          hasDiscoveredTenants={hasDiscoveredTenants}
          availableProviders={availableProviders}
          onSso={async provider => {
            await loginWithSso(provider);
          }}
          onBack={handleBack}
          isLoading={isLoading}
        />
      </AuthLayout>
    );
  }

  // oss-tenant redesigned flow: email entry → discovery → SSO providers, all in one shell.
  const handleContinue = async (enteredEmail: string) => {
    const result = await discoverTenants(enteredEmail);
    if (result && !result.has_existing_accounts) {
      toast({
        title: 'Account Not Found',
        description: "You don't have an account yet. Please create an organization first.",
        variant: 'destructive',
      });
    }
  };

  const handleSso = (provider: AuthSsoProvider) => {
    void loginWithSso(FORM_TO_SSO[provider]);
  };

  const formProviders = hasDiscoveredTenants
    ? FORM_PROVIDER_ORDER.filter(provider => availableProviders.some(id => SSO_TO_FORM[id] === provider))
    : undefined;

  const tabs = (
    <TabSelector
      value="login"
      onValueChange={value => {
        if (value === 'signup') router.push('/auth');
      }}
      variant="primary"
      items={[
        { id: 'signup', label: 'Sign Up' },
        { id: 'login', label: 'Login' },
      ]}
    />
  );

  return (
    <AuthShell tabs={tabs} mobileTagline={AUTH_MOBILE_TAGLINE}>
      <LoginSection
        initialEmail={email}
        ssoProviders={formProviders}
        onContinue={handleContinue}
        onSso={handleSso}
        isLoading={isLoading}
      />
    </AuthShell>
  );
}
