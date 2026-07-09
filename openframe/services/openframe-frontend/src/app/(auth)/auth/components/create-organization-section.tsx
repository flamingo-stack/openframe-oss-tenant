'use client';

import { CreateOrganizationForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useState } from 'react';
import { AUTH_ERROR_CODE } from '@/app/(auth)/auth/constants/auth-error-codes';
import { useDomainAvailability, useEmailAvailability } from '@/app/(auth)/auth/hooks/use-registration-availability';
import { isSaasSharedMode } from '@/lib/app-mode';
import { authApiClient, SAAS_DOMAIN_SUFFIX } from '@/lib/auth-api-client';

interface CreateOrganizationSectionProps {
  onCreateOrganization: (orgName: string, domain: string, email: string) => void;
  isLoading?: boolean;
}

/**
 * Wires the shared CreateOrganizationForm to the sign-up flow. Owns field
 * state, client-side validation and live email availability; in saas-shared
 * mode also handles subdomain sanitizing, live/submit-time domain availability
 * and the tenant-registration capacity check. Delegates submission upward.
 */
export function CreateOrganizationSection({ onCreateOrganization, isLoading }: CreateOrganizationSectionProps) {
  const { toast } = useToast();
  const isSaasShared = isSaasSharedMode();

  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [domain, setDomain] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([]);

  const orgNameRegex = /^[\p{L}\p{M}0-9&\.,'"()\- ]{2,100}$/u;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isOrgNameValid = orgNameRegex.test(organizationName.trim());

  const emailStatus = useEmailAvailability(email);
  const isEmailBlocked = emailStatus === 'taken' || emailStatus === 'checking';

  // Live subdomain availability — saas-shared only.
  const { status: domainStatus, suggestions: liveDomainSuggestions } = useDomainAvailability(
    domain,
    organizationName,
    isSaasShared,
  );
  const isDomainBlocked = isSaasShared && (domainStatus === 'taken' || domainStatus === 'checking');

  // Prefer live suggestions from the real-time check; fall back to submit-time ones.
  const domainSuggestions = liveDomainSuggestions.length > 0 ? liveDomainSuggestions : suggestedDomains;

  const isValid =
    isEmailValid && !isEmailBlocked && isOrgNameValid && !!domain.trim() && !isDomainBlocked && agreedToTerms;

  const handleDomainChange = (value: string) => {
    // Subdomains allow only lowercase letters, digits and dashes.
    setDomain(isSaasShared ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value);
    setSuggestedDomains([]);
  };

  const handleSubmit = async () => {
    if (!isValid || isCheckingDomain) return;

    if (!isSaasShared) {
      onCreateOrganization(organizationName.trim(), domain.trim(), email.trim());
      return;
    }

    // saas-shared: re-check the subdomain at submit time before proceeding.
    setIsCheckingDomain(true);
    try {
      const subdomain = domain.trim();
      const response = await authApiClient.checkDomainAvailability(subdomain, organizationName.trim());

      if (response.ok && response.data) {
        const { available, suggestedUrl } = response.data as { available: boolean; suggestedUrl?: string[] };
        if (available) {
          onCreateOrganization(organizationName.trim(), `${subdomain}.${SAAS_DOMAIN_SUFFIX}`, email.trim());
        } else {
          toast({
            title: 'Domain Not Available',
            description: `The subdomain '${subdomain}' is already taken. Please try another one.`,
            variant: 'destructive',
          });
          if (suggestedUrl && suggestedUrl.length > 0) {
            setSuggestedDomains(suggestedUrl.map(url => url.replace(`.${SAAS_DOMAIN_SUFFIX}`, '')));
          }
        }
      } else {
        const errorData = response.data as { code?: string; message?: string } | undefined;

        // 409 with TENANT_REGISTRATION_BLOCKED — no cluster capacity for new tenants.
        if (response.status === 409 && errorData?.code === AUTH_ERROR_CODE.TENANT_REGISTRATION_BLOCKED) {
          toast({
            title: 'Registration Unavailable',
            description:
              errorData.message ||
              'Registration is currently unavailable because there is no cluster capacity. Please contact your administrator or try again later.',
            variant: 'destructive',
          });
          return;
        }

        throw new Error(response.error || 'Failed to check domain availability');
      }
    } catch (error) {
      console.error('Domain check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check domain availability. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingDomain(false);
    }
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

  const domainStatusMessage =
    !isSaasShared || !domain.trim()
      ? undefined
      : domainStatus === 'checking'
        ? { message: 'Checking availability…', variant: 'muted' as const }
        : domainStatus === 'taken'
          ? { message: 'This domain is already taken. Please try another one.', variant: 'error' as const }
          : domainStatus === 'available'
            ? { message: 'Domain is available', variant: 'success' as const }
            : undefined;

  const domainSuggestionsSlot =
    isSaasShared && domainSuggestions.length > 0 ? (
      <div className="flex flex-col gap-2 text-h6 text-ods-text-secondary">
        <p>Available suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {domainSuggestions.map(suggestion => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="small-legacy"
              onClick={() => {
                setDomain(suggestion);
                setSuggestedDomains([]);
              }}
            >
              {suggestion}.{SAAS_DOMAIN_SUFFIX}
            </Button>
          ))}
        </div>
      </div>
    ) : undefined;

  return (
    <CreateOrganizationForm
      email={email}
      organizationName={organizationName}
      domain={domain}
      agreedToTerms={agreedToTerms}
      onEmailChange={setEmail}
      onOrganizationNameChange={setOrganizationName}
      onDomainChange={handleDomainChange}
      onAgreedToTermsChange={setAgreedToTerms}
      onSubmit={handleSubmit}
      submitDisabled={!isValid}
      loading={isLoading || isCheckingDomain}
      domainSuffix={isSaasShared ? `.${SAAS_DOMAIN_SUFFIX}` : undefined}
      termsUrl="https://www.flamingo.run/terms-of-service"
      privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
      emailStatus={emailStatusMessage}
      domainStatus={domainStatusMessage}
      domainSlot={domainSuggestionsSlot}
      errors={{
        email: email.trim() && !isEmailValid ? 'Enter a valid email address' : undefined,
        organizationName:
          organizationName.trim() && !isOrgNameValid ? 'Organization Name must be 2-100 characters' : undefined,
      }}
    />
  );
}
