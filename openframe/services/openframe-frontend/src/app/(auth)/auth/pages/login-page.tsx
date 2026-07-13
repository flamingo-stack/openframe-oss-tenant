'use client';

import { AuthShell, type AuthSsoProvider } from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginSection } from '@/app/(auth)/auth/components/login-form-section';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isAuthOnlyMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';

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
  const { hasDiscoveredTenants, availableProviders, isLoading, loginWithSso, discoverTenants } = useAuth();

  // The SSO state (locked email + provider buttons) is shown only after a
  // discovery made on THIS visit — a persisted discovery from a previous
  // session would otherwise trap the user on a screen with a locked email.
  const [discoveredThisVisit, setDiscoveredThisVisit] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push(routes.dashboard);
    }
  }, [isAuthenticated, router]);

  // Redesigned flow: email entry → discovery → SSO providers, all in one shell.
  const handleContinue = async (enteredEmail: string) => {
    const result = await discoverTenants(enteredEmail);
    if (result && !result.has_existing_accounts) {
      toast({
        title: 'Account Not Found',
        description: "You don't have an account yet. Please create an organization first.",
        variant: 'destructive',
      });
      return;
    }
    if (result) setDiscoveredThisVisit(true);
  };

  const handleSso = (provider: AuthSsoProvider) => {
    void loginWithSso(FORM_TO_SSO[provider]);
  };

  const formProviders =
    discoveredThisVisit && hasDiscoveredTenants
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
    <AuthShell tabs={tabs}>
      {/* No initialEmail on purpose — the field always starts empty */}
      <LoginSection ssoProviders={formProviders} onContinue={handleContinue} onSso={handleSso} isLoading={isLoading} />
    </AuthShell>
  );
}
