'use client';

import {
  AuthShell,
  type AuthSsoProvider,
  BackToLoginLink,
  CompleteAccountForm,
  InviteLinkInvalidModal,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useInviteProviders } from '@/app/(auth)/auth/hooks/use-invite-providers';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { authApiClient } from '@/lib/auth-api-client';

const MIN_PASSWORD_LENGTH = 8;

// Backend provider id ↔ form provider id (external providers only)
const SSO_TO_FORM: Record<string, AuthSsoProvider> = {
  google: 'google',
  microsoft: 'microsoft',
};

function isInvalidInviteError(error: string | null): boolean {
  return !!error && (error.includes('Invitation not found') || error.includes('Invitation already used or revoked'));
}

export default function InvitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('id');

  const { providers, loading, error } = useInviteProviders(invitationId);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTenantSwitch, setShowTenantSwitch] = useState(false);

  const handleBack = () => router.push('/auth');

  const isTooShort = !!password && password.length < MIN_PASSWORD_LENGTH;
  const isMismatch = !!confirmPassword && password !== confirmPassword;
  const isValid =
    !!firstName.trim() && !!lastName.trim() && password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmit = async (switchTenant = false) => {
    if (!invitationId || !isValid) return;

    setIsSubmitting(true);
    try {
      const response = await authApiClient.acceptInvitation({
        invitationId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        switchTenant,
      });

      if (!response.ok) {
        const errorData = response.data as any;

        // Already active elsewhere — confirm the tenant switch, then retry.
        if (errorData?.code === 'USER_IS_ACTIVE_IN_ANOTHER_TENANT') {
          setShowTenantSwitch(true);
          setIsSubmitting(false);
          return;
        }

        throw new Error(errorData?.message || response.error || 'Failed to accept invitation');
      }

      toast({
        title: 'Invitation Accepted!',
        description: 'Your account has been created successfully. Redirecting to login...',
        variant: 'success',
      });

      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (err) {
      console.error('Invitation acceptance error:', err);
      toast({
        title: 'Acceptance Failed',
        description: err instanceof Error ? err.message : 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSso = (provider: AuthSsoProvider) => {
    if (!invitationId || (provider !== 'google' && provider !== 'microsoft')) return;

    setIsSubmitting(true);
    try {
      // Redirects the browser; acceptInvitationSso passes the provider through in the URL.
      void authApiClient.acceptInvitationSso({
        invitationId,
        provider,
        switchTenant: true,
        redirectTo: '/auth/login',
      });
    } catch (err) {
      console.error('SSO signup error:', err);
      toast({
        title: 'SSO Signup Failed',
        description: 'Unable to initiate SSO signup. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  // Expired / already-used / missing link → dedicated notice.
  if (!invitationId || isInvalidInviteError(error)) {
    return <InviteLinkInvalidModal onBackToLogin={handleBack} />;
  }

  const formProviders: AuthSsoProvider[] = (['google', 'microsoft'] as const).filter(provider =>
    providers.some(sp => SSO_TO_FORM[sp.provider] === provider),
  );

  return (
    <AuthShell footer={<BackToLoginLink onClick={handleBack} />}>
      <CompleteAccountForm
        firstName={firstName}
        lastName={lastName}
        password={password}
        confirmPassword={confirmPassword}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={() => handleSubmit()}
        ssoProviders={formProviders}
        onSsoClick={handleSso}
        title="Accept Invitation"
        subtitle="Complete your registration to join the organization"
        submitDisabled={!isValid}
        loading={loading || isSubmitting}
        errors={{
          password: isTooShort ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters` : undefined,
          confirmPassword: isMismatch ? 'Passwords do not match' : undefined,
        }}
      />

      <ConfirmDialog
        open={showTenantSwitch}
        onOpenChange={setShowTenantSwitch}
        title="Switch Organization?"
        description="You are already registered in another organization. Would you like to switch to this new organization?"
        confirmLabel="Yes, Switch Organization"
        variant="default"
        onConfirm={() => handleSubmit(true)}
      />
    </AuthShell>
  );
}
