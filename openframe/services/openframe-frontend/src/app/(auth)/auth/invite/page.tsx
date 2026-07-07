'use client';

import {
  AcceptInvitationForm,
  AuthShell,
  type AuthSsoProvider,
  BackToLoginLink,
  InviteLinkInvalidModal,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useInviteProviders } from '@/app/(auth)/auth/hooks/use-invite-providers';
import { authApiClient } from '@/lib/auth-api-client';

const AUTH_MOBILE_TAGLINE = (
  <>
    <p>All your MSP ops in one place.</p>
    <p>Open-source, AI-ready, no vendor tax.</p>
  </>
);

// Backend provider id ↔ AcceptInvitationForm provider id
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

function isInvalidInviteError(error: string | null): boolean {
  return !!error && (error.includes('Invitation not found') || error.includes('Invitation already used or revoked'));
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('id');

  const { providers, email, loading, error } = useInviteProviders(invitationId);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => router.push('/auth');

  const handleSso = (provider: AuthSsoProvider) => {
    if (!invitationId) return;
    setIsSubmitting(true);
    // Redirects the browser; acceptInvitationSso passes the provider through in the URL.
    void authApiClient.acceptInvitationSso({
      invitationId,
      provider: FORM_TO_SSO[provider] as 'google' | 'microsoft',
      switchTenant: true,
      redirectTo: '/auth/login',
    });
  };

  // Expired / already-used / missing link → dedicated notice.
  if (!invitationId || isInvalidInviteError(error)) {
    return <InviteLinkInvalidModal onBackToLogin={handleBack} />;
  }

  const formProviders = FORM_PROVIDER_ORDER.filter(provider =>
    providers.some(sp => SSO_TO_FORM[sp.provider] === provider),
  );

  return (
    <AuthShell mobileTagline={AUTH_MOBILE_TAGLINE} footer={<BackToLoginLink onClick={handleBack} />}>
      <AcceptInvitationForm
        email={email}
        agreedToTerms={agreedToTerms}
        onAgreedToTermsChange={setAgreedToTerms}
        ssoProviders={formProviders}
        onSsoClick={handleSso}
        onBackToLogin={handleBack}
        termsUrl="https://www.flamingo.run/terms-of-service"
        privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
        loading={loading || isSubmitting}
      />
    </AuthShell>
  );
}
