'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useState } from 'react';
import { isSaasSharedMode } from '@/lib/app-mode';
import { authApiClient, SAAS_DOMAIN_SUFFIX } from '@/lib/auth-api-client';
import { AUTH_ERROR_CODE } from '../constants/auth-error-codes';
import { useDomainAvailability, useEmailAvailability } from '../hooks/use-registration-availability';
import { ForgotPasswordModal } from './forgot-password-modal';

interface AuthChoiceSectionProps {
  onCreateOrganization: (orgName: string, domain: string, email: string) => void;
  onSignIn: (email: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Auth choice section with Create Organization and Sign In forms
 */
export function AuthChoiceSection({ onCreateOrganization, onSignIn, isLoading }: AuthChoiceSectionProps) {
  const { toast } = useToast();
  const isSaasShared = isSaasSharedMode();

  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const orgNameRegex = /^[\p{L}\p{M}0-9&\.,'"()\- ]{2,100}$/u;
  const isOrgNameValid = orgNameRegex.test(orgName.trim());

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isOrgEmailValid = emailRegex.test(orgEmail.trim());
  const isSignInEmailValid = emailRegex.test(signInEmail.trim());

  // Real-time availability checks (debounced).
  const emailStatus = useEmailAvailability(orgEmail);
  const { status: domainStatus, suggestions: liveDomainSuggestions } = useDomainAvailability(
    domain,
    orgName,
    isSaasShared,
  );

  // Prefer live suggestions from the real-time check; fall back to submit-time ones.
  const domainSuggestions = liveDomainSuggestions.length > 0 ? liveDomainSuggestions : suggestedDomains;

  const handleCreateOrganization = async () => {
    if (!orgName.trim() || !isOrgNameValid || !isOrgEmailValid) return;

    // Block submit while the email check is pending or if it flagged the email as
    // registered — keeps the Enter-key paths aligned with the disabled Continue button.
    if (emailStatus === 'checking' || emailStatus === 'taken') return;

    if (isSaasShared && domain.trim()) {
      setIsCheckingDomain(true);
      setSuggestedDomains([]);

      try {
        const subdomain = domain.trim();
        const response = await authApiClient.checkDomainAvailability(subdomain, orgName.trim());

        if (response.ok && response.data) {
          const { available, suggestedUrl } = response.data as { available: boolean; suggestedUrl?: string[] };

          if (available) {
            const fullDomain = `${subdomain}.${SAAS_DOMAIN_SUFFIX}`;
            onCreateOrganization(orgName.trim(), fullDomain, orgEmail.trim());
          } else {
            toast({
              title: 'Domain Not Available',
              description: `The subdomain '${subdomain}' is already taken. Please try another one.`,
              variant: 'destructive',
            });

            if (suggestedUrl && suggestedUrl.length > 0) {
              const suggestions = suggestedUrl.map(url => url.replace(`.${SAAS_DOMAIN_SUFFIX}`, ''));
              setSuggestedDomains(suggestions);
            }
          }
        } else {
          const errorData = response.data as { code?: string; message?: string } | undefined;

          // 409 Conflict with code TENANT_REGISTRATION_BLOCKED means registration cannot
          // proceed because there is no available cluster capacity. Surface the backend
          // message so the user knows to contact the admin or wait for capacity.
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
    } else {
      onCreateOrganization(orgName.trim(), domain, orgEmail.trim());
    }
  };

  const handleSignIn = async () => {
    if (isSignInEmailValid && !isSigningIn) {
      setIsSigningIn(true);
      try {
        await onSignIn(signInEmail.trim());
      } finally {
        setIsSigningIn(false);
      }
    }
  };

  return (
    <>
      {/* Create Organization Section */}
      <div className="bg-ods-card border border-ods-border rounded-sm p-10 relative">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px]">
              Create Organization
            </h1>
            <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">
              Start your journey with OpenFrame.
            </p>
          </div>

          {/* Email and Organization Name Fields - Side by Side */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={orgEmail}
                onChange={e => setOrgEmail(e.target.value)}
                placeholder="username@mail.com"
                disabled={isLoading}
                className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isLoading && isOrgEmailValid && isOrgNameValid) {
                    handleCreateOrganization();
                  }
                }}
              />
              {orgEmail.trim() && !isOrgEmailValid && (
                <p className="text-xs text-ods-error mt-1">Enter a valid email address</p>
              )}
              {isOrgEmailValid && emailStatus === 'checking' && (
                <p className="text-xs text-ods-text-secondary mt-1">Checking availability…</p>
              )}
              {isOrgEmailValid && emailStatus === 'taken' && (
                <p className="text-xs text-ods-error mt-1">This email is already registered. Sign in instead.</p>
              )}
              {isOrgEmailValid && emailStatus === 'available' && (
                <p className="text-xs text-ods-success mt-1">Email is available</p>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label>Organization Name</Label>
              <Input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Your Company Name"
                disabled={isLoading}
                className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isLoading && isOrgNameValid) {
                    handleCreateOrganization();
                  }
                }}
              />
              {orgName.trim() && !isOrgNameValid && (
                <p className="text-xs text-ods-error mt-1">
                  Organization Name must be 2-100 characters and may include letters, numbers, spaces, and
                  &.,&apos;&quot;()-
                </p>
              )}
            </div>
          </div>

          {/* Domain Field - Full Width */}
          <div className="flex flex-col gap-1">
            <Label>{isSaasShared ? 'Domain' : 'Domain'}</Label>
            <div className="flex flex-col gap-2">
              {isSaasShared ? (
                <Input
                  value={domain}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleCreateOrganization();
                    }
                  }}
                  onChange={e => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setDomain(value);
                    setSuggestedDomains([]);
                  }}
                  placeholder="company-name"
                  disabled={isLoading}
                  className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                  endAdornment={
                    <span className="text-ods-text-secondary font-body text-[14px] font-medium whitespace-nowrap select-none">
                      .{SAAS_DOMAIN_SUFFIX}
                    </span>
                  }
                />
              ) : (
                <Input
                  value={domain}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleCreateOrganization();
                    }
                  }}
                  onChange={e => {
                    setDomain(e.target.value);
                    setSuggestedDomains([]);
                  }}
                  placeholder="company-name"
                  disabled={isLoading}
                  className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                />
              )}
              {isSaasShared && domain.trim() && domainStatus === 'checking' && (
                <p className="text-xs text-ods-text-secondary">Checking availability…</p>
              )}
              {isSaasShared && domain.trim() && domainStatus === 'taken' && (
                <p className="text-xs text-ods-error">This domain is already taken. Please try another one.</p>
              )}
              {isSaasShared && domain.trim() && domainStatus === 'available' && (
                <p className="text-xs text-ods-success">Domain is available</p>
              )}
              {domainSuggestions.length > 0 && (
                <div className="text-sm text-ods-text-secondary">
                  <p className="mb-1">Available suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {domainSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        onClick={() => {
                          setDomain(suggestion);
                          setSuggestedDomains([]);
                        }}
                        variant="outline"
                        size="small-legacy"
                        className="font-body"
                      >
                        {suggestion}.{SAAS_DOMAIN_SUFFIX}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Button Row */}
          <div className="flex gap-6 items-center">
            <div className="flex-1"></div>
            <div className="flex-1">
              <Button
                onClick={handleCreateOrganization}
                disabled={
                  !orgName.trim() ||
                  !isOrgEmailValid ||
                  emailStatus === 'taken' ||
                  emailStatus === 'checking' ||
                  (isSaasShared && !domain.trim()) ||
                  (isSaasShared && (domainStatus === 'taken' || domainStatus === 'checking')) ||
                  isLoading ||
                  isCheckingDomain
                }
                loading={isLoading || isCheckingDomain}
                variant="accent"
                className="!w-full md:!w-full"
              >
                {isCheckingDomain ? 'Checking...' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Already Have an Account Section */}
      <div className="bg-ods-bg border border-ods-border rounded-sm p-10 relative">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px]">
              Already Have an Account?
            </h1>
            <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">
              Enter you email to access your organization.
            </p>
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={signInEmail}
              onChange={e => setSignInEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !isLoading && isSignInEmailValid) {
                  handleSignIn();
                }
              }}
              placeholder="username@mail.com"
              disabled={isLoading}
              className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3 w-full"
            />
            {signInEmail.trim() && !isSignInEmailValid && (
              <p className="text-xs text-ods-error mt-1">Enter a valid email address</p>
            )}
          </div>

          {/* Button Row with Forgot Password */}
          <div className="flex gap-6 items-center">
            <div className="flex-1 flex items-center">
              <Button onClick={() => setShowForgotPassword(true)} variant="transparent" className="!w-full md:!w-full">
                Forgot password?
              </Button>
            </div>
            <div className="flex-1">
              <Button
                onClick={handleSignIn}
                disabled={!isSignInEmailValid || isSigningIn || isLoading}
                loading={isSigningIn || isLoading}
                variant="accent"
                className="!w-full md:!w-full"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} defaultEmail={signInEmail} />
    </>
  );
}
