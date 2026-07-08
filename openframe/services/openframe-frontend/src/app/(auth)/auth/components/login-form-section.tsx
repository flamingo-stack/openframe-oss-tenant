'use client';

import { type AuthSsoProvider, LoginForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useEffect, useState } from 'react';
import { ForgotPasswordModal } from './forgot-password-modal';

interface LoginSectionProps {
  /** Email pre-seeded from storage (e.g. after org registration). */
  initialEmail?: string;
  /** SSO providers to offer once tenant discovery succeeded; undefined = email-entry state. */
  ssoProviders?: AuthSsoProvider[];
  /** Continue in the email-entry state — triggers tenant discovery. */
  onContinue: (email: string) => void;
  onSso: (provider: AuthSsoProvider) => void;
  isLoading?: boolean;
}

/**
 * Wires the shared LoginForm to the login flow (oss-tenant). Owns the email
 * field and client-side validation; discovery and SSO submission stay upstream.
 */
export function LoginSection({ initialEmail, ssoProviders, onContinue, onSso, isLoading }: LoginSectionProps) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Seed the field once a stored email hydrates; never clobber what the user typed.
  useEffect(() => {
    if (initialEmail) setEmail(prev => prev || initialEmail);
  }, [initialEmail]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());

  const handleSubmit = () => {
    if (!isEmailValid) return;
    onContinue(email.trim());
  };

  return (
    <>
      <LoginForm
        email={email}
        onEmailChange={setEmail}
        onSubmit={handleSubmit}
        onForgotPassword={() => setShowForgotPassword(true)}
        submitDisabled={!isEmailValid}
        loading={isLoading}
        ssoProviders={ssoProviders}
        onSsoClick={onSso}
        errors={{
          email: email.trim() && !isEmailValid ? 'Enter a valid email address' : undefined,
        }}
      />

      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} defaultEmail={email} />
    </>
  );
}
