'use client';

import { AuthShell } from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthChoiceSection } from '@/app/(auth)/auth/components/choice-section';
import { CreateOrganizationSection } from '@/app/(auth)/auth/components/create-organization-section';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { AuthLayout } from '@/app/(auth)/auth/layouts';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isAuthOnlyMode, isSaasSharedMode } from '@/lib/app-mode';

const AUTH_MOBILE_TAGLINE = (
  <>
    <p>All your MSP ops in one place.</p>
    <p>Open-source, AI-ready, no vendor tax.</p>
  </>
);

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { discoverTenants } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleCreateOrganization = (orgName: string, domain: string, accessCode: string, email: string) => {
    // Store org details and navigate to signup screen
    sessionStorage.setItem('auth:org_name', orgName);
    sessionStorage.setItem('auth:domain', domain);
    sessionStorage.setItem('auth:access_code', accessCode);
    sessionStorage.setItem('auth:email', email);
    router.push('/auth/signup/');
  };

  const handleSignIn = async (email: string) => {
    const result = await discoverTenants(email);

    if (result && result.has_existing_accounts) {
      router.push('/auth/login');
    } else {
      toast({
        title: 'Account Not Found',
        description: "You don't have an account yet. Please create an organization first.",
        variant: 'destructive',
      });
    }
  };

  // saas-shared keeps the existing two-card flow (access code / waitlist) until its own redesign.
  if (isSaasSharedMode()) {
    return (
      <AuthLayout>
        <AuthChoiceSection onCreateOrganization={handleCreateOrganization} onSignIn={handleSignIn} />
      </AuthLayout>
    );
  }

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
      <CreateOrganizationSection onCreateOrganization={handleCreateOrganization} />
    </AuthShell>
  );
}
