'use client';

import { CreateOrganizationForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useState } from 'react';
import { useEmailAvailability } from '@/app/(auth)/auth/hooks/use-registration-availability';

interface CreateOrganizationSectionProps {
  onCreateOrganization: (orgName: string, domain: string, email: string) => void;
  isLoading?: boolean;
}

/**
 * Wires the shared CreateOrganizationForm to the sign-up flow (oss-tenant).
 * Owns field state, client-side validation and live email availability;
 * delegates submission upward.
 */
export function CreateOrganizationSection({ onCreateOrganization, isLoading }: CreateOrganizationSectionProps) {
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [domain, setDomain] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const orgNameRegex = /^[\p{L}\p{M}0-9&\.,'"()\- ]{2,100}$/u;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isOrgNameValid = orgNameRegex.test(organizationName.trim());

  const emailStatus = useEmailAvailability(email);
  const isEmailBlocked = emailStatus === 'taken' || emailStatus === 'checking';

  const isValid = isEmailValid && !isEmailBlocked && isOrgNameValid && !!domain.trim() && agreedToTerms;

  const handleSubmit = () => {
    if (!isValid) return;
    onCreateOrganization(organizationName.trim(), domain.trim(), email.trim());
  };

  const emailStatusMessage = !isEmailValid
    ? undefined
    : emailStatus === 'checking'
      ? { message: 'Checking availability…', variant: 'muted' as const }
      : emailStatus === 'taken'
        ? { message: 'This email is already registered. Sign in instead.', variant: 'error' as const }
        : emailStatus === 'available'
          ? { message: 'Email is available', variant: 'success' as const }
          : undefined;

  return (
    <CreateOrganizationForm
      email={email}
      organizationName={organizationName}
      domain={domain}
      agreedToTerms={agreedToTerms}
      onEmailChange={setEmail}
      onOrganizationNameChange={setOrganizationName}
      onDomainChange={setDomain}
      onAgreedToTermsChange={setAgreedToTerms}
      onSubmit={handleSubmit}
      submitDisabled={!isValid}
      loading={isLoading}
      termsUrl="https://www.flamingo.run/terms-of-service"
      privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
      emailStatus={emailStatusMessage}
      errors={{
        email: email.trim() && !isEmailValid ? 'Enter a valid email address' : undefined,
        organizationName:
          organizationName.trim() && !isOrgNameValid ? 'Organization Name must be 2-100 characters' : undefined,
      }}
    />
  );
}
