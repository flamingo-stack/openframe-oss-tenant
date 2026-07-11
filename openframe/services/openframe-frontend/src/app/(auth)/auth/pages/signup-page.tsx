'use client';

import {
  AuthShell,
  type AuthSsoProvider,
  CompleteAccountForm,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/(auth)/auth/hooks/use-auth';
import { useRegistrationProviders } from '@/app/(auth)/auth/hooks/use-registration-providers';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { isAuthOnlyMode, isSaasSharedMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';

const MIN_PASSWORD_LENGTH = 8;

/**
 * "Complete your Account" step: name + password for the organization collected
 * on the Create Organization step, or an external SSO provider shortcut.
 */
export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoading, registerOrganization, registerOrganizationSso } = useAuth();
  const { providers, loading: loadingProviders } = useRegistrationProviders();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : '';
  const storedDomain = typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || '' : '';
  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('auth:email') || '' : '';

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push(routes.dashboard);
    }
  }, [isAuthenticated, router]);

  // This screen only completes the Create Organization step — without the org
  // details from it (direct URL visit, expired/stale sessionStorage) there is
  // nothing to register, so send the user back to the form.
  useEffect(() => {
    if (!storedOrgName || !storedDomain || !storedEmail) {
      router.replace('/auth');
    }
  }, [storedOrgName, storedDomain, storedEmail, router]);

  if (!storedOrgName || !storedDomain || !storedEmail) return null;

  const isTooShort = !!password && password.length < MIN_PASSWORD_LENGTH;
  const isMismatch = !!confirmPassword && password !== confirmPassword;
  const isValid =
    !!firstName.trim() && !!lastName.trim() && password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmit = () => {
    if (!isValid) return;
    registerOrganization({
      tenantName: storedOrgName,
      tenantDomain: storedDomain,
      email: storedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    });
  };

  // External providers offered by the backend for registration.
  const formProviders: AuthSsoProvider[] = (['google', 'microsoft'] as const).filter(provider =>
    providers.some(sp => sp.provider === provider),
  );

  const handleSso = (provider: AuthSsoProvider) => {
    if (provider !== 'google' && provider !== 'microsoft') return;
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
    <AuthShell tabs={tabs}>
      <CompleteAccountForm
        firstName={firstName}
        lastName={lastName}
        password={password}
        confirmPassword={confirmPassword}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        onBack={() => router.push('/auth')}
        ssoProviders={formProviders}
        onSsoClick={handleSso}
        submitLabel={isSaasSharedMode() ? 'Start Free Trial' : 'Create Organization'}
        submitDisabled={!isValid}
        loading={isLoading || loadingProviders}
        errors={{
          password: isTooShort ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters` : undefined,
          confirmPassword: isMismatch ? 'Passwords do not match' : undefined,
        }}
      />
    </AuthShell>
  );
}
