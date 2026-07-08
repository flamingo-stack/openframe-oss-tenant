'use client';

import { AuthShell } from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { type SignUpFormData, SignUpSection } from '@/app/(auth)/auth/components/signup-form-section';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isAuthOnlyMode } from '@/lib/app-mode';

const AUTH_MOBILE_TAGLINE = (
  <>
    <p>All your MSP ops in one place.</p>
    <p>Open-source, AI-ready, no vendor tax.</p>
  </>
);

/**
 * OpenFrame SSO sign-up step: create OpenFrame SSO credentials (name, password)
 * for the organization collected on the Create Organization step.
 */
export default function SignupOpenFramePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoading, registerOrganization } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Org details collected on the Create Organization step.
  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : '';
  const storedDomain = typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || '' : '';
  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('auth:email') || '' : '';

  // This screen only completes the Create Organization step — without the org
  // details from it (direct URL visit, expired sessionStorage) there is nothing
  // to register, so send the user back to the form.
  useEffect(() => {
    if (!storedOrgName || !storedDomain) {
      router.replace('/auth');
    }
  }, [storedOrgName, storedDomain, router]);

  if (!storedOrgName || !storedDomain) return null;

  const handleSubmit = (data: SignUpFormData) => {
    registerOrganization({
      tenantName: storedOrgName,
      tenantDomain: storedDomain,
      ...data,
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
      <SignUpSection initialEmail={storedEmail} onSubmit={handleSubmit} isLoading={isLoading} />
    </AuthShell>
  );
}
