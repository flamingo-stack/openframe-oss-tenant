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

export default function SignupPage() {
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
  const storedDomain =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || 'localhost' : 'localhost';
  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('auth:email') || '' : '';

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
