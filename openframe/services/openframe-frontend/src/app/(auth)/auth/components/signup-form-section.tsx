'use client';

import { OpenFrameSsoSignUpForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useState } from 'react';
import { ForgotPasswordModal } from './forgot-password-modal';

const MIN_PASSWORD_LENGTH = 8;

export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface SignUpSectionProps {
  /** Email carried over from the Create Organization step. */
  initialEmail?: string;
  onSubmit: (data: SignUpFormData) => void;
  isLoading?: boolean;
}

/**
 * Wires the shared OpenFrameSsoSignUpForm to the registration flow. Owns field
 * state and client-side validation; delegates submission upward. "Forgot
 * Password?" opens the existing reset-link modal.
 */
export function SignUpSection({ initialEmail = '', onSubmit, isLoading }: SignUpSectionProps) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isTooShort = !!password && password.length < MIN_PASSWORD_LENGTH;
  const isMismatch = !!confirmPassword && password !== confirmPassword;

  const isValid =
    isEmailValid &&
    !!firstName.trim() &&
    !!lastName.trim() &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword &&
    agreedToTerms;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <>
      <OpenFrameSsoSignUpForm
        email={email}
        firstName={firstName}
        lastName={lastName}
        password={password}
        confirmPassword={confirmPassword}
        agreedToTerms={agreedToTerms}
        onEmailChange={setEmail}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onAgreedToTermsChange={setAgreedToTerms}
        onSubmit={handleSubmit}
        onForgotPassword={() => setShowForgotPassword(true)}
        submitDisabled={!isValid}
        loading={isLoading}
        termsUrl="https://www.flamingo.run/terms-of-service"
        privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
        errors={{
          email: email.trim() && !isEmailValid ? 'Enter a valid email address' : undefined,
          password: isTooShort ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters` : undefined,
          confirmPassword: isMismatch ? 'Passwords do not match' : undefined,
        }}
      />

      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} defaultEmail={email} />
    </>
  );
}
