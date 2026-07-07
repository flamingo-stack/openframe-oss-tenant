'use client';

import { CreateOrganizationForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useState } from 'react';

interface CreateOrganizationSectionProps {
  onCreateOrganization: (orgName: string, domain: string, accessCode: string, email: string) => void;
  isLoading?: boolean;
}

/**
 * Wires the shared CreateOrganizationForm to the sign-up flow (oss-tenant).
 * Owns field state and client-side validation; delegates submission upward.
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
  const isValid = isEmailValid && isOrgNameValid && !!domain.trim() && agreedToTerms;

  const handleSubmit = () => {
    if (!isValid) return;
    onCreateOrganization(organizationName.trim(), domain.trim(), '', email.trim());
  };

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
      errors={{
        email: email.trim() && !isEmailValid ? 'Enter a valid email address' : undefined,
        organizationName:
          organizationName.trim() && !isOrgNameValid ? 'Organization Name must be 2-100 characters' : undefined,
      }}
    />
  );
}
