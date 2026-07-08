'use client';

import {
  AuthShell,
  type AuthSsoProvider,
  CreateOrganizationForm,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { useRegistrationProviders } from '@/app/(auth)/auth/hooks/use-registration-providers';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isAuthOnlyMode, isSaasSharedMode } from '@/lib/app-mode';
import { SAAS_DOMAIN_SUFFIX } from '@/lib/auth-api-client';

const AUTH_MOBILE_TAGLINE = (
  <>
    <p>All your MSP ops in one place.</p>
    <p>Open-source, AI-ready, no vendor tax.</p>
  </>
);

// Backend provider id ↔ form provider id
const SSO_TO_FORM: Record<string, AuthSsoProvider> = {
  'openframe-sso': 'openframe',
  google: 'google',
  microsoft: 'microsoft',
};

/**
 * Sign Up (SSO) step: the Create Organization details entered on the previous
 * screen are shown locked, and the user picks how to register — OpenFrame SSO
 * (credentials form) or an external provider.
 */
export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoading, registerOrganizationSso } = useAuth();
  const { providers, loading: loadingProviders } = useRegistrationProviders();

  const isSaasShared = isSaasSharedMode();

  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : '';
  const storedDomain = typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || '' : '';
  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('auth:email') || '' : '';

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // This screen only completes the Create Organization step — without the org
  // details from it (direct URL visit, expired sessionStorage) there is nothing
  // to register, so send the user back to the form.
  useEffect(() => {
    if (!storedOrgName || !storedDomain) {
      router.replace('/auth');
    }
  }, [storedOrgName, storedDomain, router]);

  if (!storedOrgName || !storedDomain) return null;

  // saas-shared stores the full domain; show the subdomain with the suffix adornment.
  const domainSuffix = `.${SAAS_DOMAIN_SUFFIX}`;
  const displayDomain =
    isSaasShared && storedDomain.endsWith(domainSuffix) ? storedDomain.slice(0, -domainSuffix.length) : storedDomain;

  // OpenFrame SSO is always offered; external providers come from the backend.
  const formProviders: AuthSsoProvider[] = [
    'openframe',
    ...(['google', 'microsoft'] as const).filter(provider =>
      providers.some(sp => SSO_TO_FORM[sp.provider] === provider),
    ),
  ];

  const handleSso = (provider: AuthSsoProvider) => {
    if (provider === 'openframe') {
      router.push('/auth/signup/openframe/');
      return;
    }
    void registerOrganizationSso({
      tenantName: storedOrgName,
      tenantDomain: storedDomain,
      email: storedEmail,
      provider,
      redirectTo: '/auth/login',
    });
  };

  const tabs = (
    <TabSelector
      value="signup"
      onValueChange={value => {
        if (value === 'login') router.push('/auth/login');
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
      <CreateOrganizationForm
        email={storedEmail}
        organizationName={storedOrgName}
        domain={displayDomain}
        agreedToTerms
        onEmailChange={() => {}}
        onOrganizationNameChange={() => {}}
        onDomainChange={() => {}}
        onAgreedToTermsChange={() => {}}
        onSubmit={() => {}}
        domainSuffix={isSaasShared ? domainSuffix : undefined}
        termsUrl="https://www.flamingo.run/terms-of-service"
        privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
        ssoProviders={formProviders}
        onSsoClick={handleSso}
        loading={isLoading || loadingProviders}
      />
    </AuthShell>
  );
}
