'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthSignupSection } from '@/app/(auth)/auth/components/signup-section';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { AuthLayout } from '@/app/(auth)/auth/layouts';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { isAuthOnlyMode } from '@/lib/app-mode';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    isLoading,
    registerOrganization,
    registerOrganizationSso: registerOrganizationSso,
    loginWithSso: loginWithSso,
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : '';
  const storedDomain =
    typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || 'localhost' : 'localhost';
  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('auth:email') || '' : '';

  const handleSignupSubmit = (data: any) => {
    registerOrganization(data);
  };

  const handleSsoSignup = async (provider: string) => {
    if (storedOrgName && storedDomain) {
      // Stale session data without email — restart from the choice step
      if (!storedEmail) {
        router.push('/auth/');
        return;
      }
      await registerOrganizationSso({
        tenantName: storedOrgName,
        tenantDomain: storedDomain,
        email: storedEmail,
        provider: provider as 'google' | 'microsoft',
        redirectTo: '/auth/login',
      });
    } else {
      if (storedOrgName) {
        sessionStorage.setItem('auth:signup_org', storedOrgName);
        sessionStorage.setItem('auth:signup_domain', storedDomain);
      }
      await loginWithSso(provider);
    }
  };

  const handleBack = useSafeBack('/auth/');

  return (
    <AuthLayout>
      <AuthSignupSection
        orgName={storedOrgName}
        domain={storedDomain}
        email={storedEmail}
        onSubmit={handleSignupSubmit}
        onSso={handleSsoSignup}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </AuthLayout>
  );
}
