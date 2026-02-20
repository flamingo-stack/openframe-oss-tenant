'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { isSaasSharedMode } from '@lib/app-mode'
import { authApiClient, SAAS_DOMAIN_SUFFIX } from '@lib/auth-api-client'
import { ForgotPasswordModal } from './forgot-password-modal'

interface AuthChoiceSectionProps {
  onCreateOrganization: (orgName: string, domain: string, accessCode: string, email: string) => void
  onSignIn: (email: string) => Promise<void>
  isLoading?: boolean
}

/**
 * Auth choice section with Create Organization and Sign In forms
 */
export function AuthChoiceSection({ onCreateOrganization, onSignIn, isLoading }: AuthChoiceSectionProps) {
  const { toast } = useToast()
  const isSaasShared = isSaasSharedMode()

  const [orgName, setOrgName] = useState('')
  const [domain, setDomain] = useState(isSaasShared ? '' : 'localhost')
  const [orgEmail, setOrgEmail] = useState('')
  const [signInEmail, setSignInEmail] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCheckingDomain, setIsCheckingDomain] = useState(false)
  const [isValidatingAccessCode, setIsValidatingAccessCode] = useState(false)
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([])
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const orgNameRegex = /^[\p{L}\p{M}0-9&\.,'"()\- ]{2,100}$/u
  const isOrgNameValid = orgNameRegex.test(orgName.trim())

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isOrgEmailValid = emailRegex.test(orgEmail.trim())
  const isSignInEmailValid = emailRegex.test(signInEmail.trim())

  const handleCreateOrganization = async () => {
    if (!orgName.trim() || !isOrgNameValid || !isOrgEmailValid) return
    
    if (isSaasShared) {
      if (!accessCode.trim()) {
        setAccessCodeError('Access code is required')
        return
      }
      setAccessCodeError(null)
      
      setIsValidatingAccessCode(true)
      try {
        const validateResponse = await authApiClient.validateAccessCode(orgEmail.trim(), accessCode.trim())
        
        if (!validateResponse.ok || !validateResponse.data) {
          const error = validateResponse?.data?.code || 'Failed to validate access code'
          
          if (error.includes('ACCESS_CODE_ALREADY_USED')) {
            setAccessCodeError('This access code has already been used')
            toast({
              title: "Access Code Already Used",
              description: "This access code has already been used.",
              variant: "destructive"
            })
          } else if (['ACCESS_CODE_VALIDATION_FAILED', 'INVALID_ACCESS_CODE'].includes(error)) {
            setAccessCodeError('Invalid access code')
            toast({
              title: "Invalid Access Code",
              description: "The access code is not valid.",
              variant: "destructive"
            })
          } else {
            setAccessCodeError('Access code validation failed')
            toast({
              title: "Validation Failed",
              description: error,
              variant: "destructive"
            })
          }
          return
        }
      } catch (error) {
        console.error('Access code validation error:', error)
        setAccessCodeError('Failed to validate access code')
        toast({
          title: "Validation Error",
          description: "Unable to validate access code.",
          variant: "destructive"
        })
        return
      } finally {
        setIsValidatingAccessCode(false)
      }
    }

    if (isSaasShared && domain.trim()) {
      setIsCheckingDomain(true)
      setSuggestedDomains([])
      
      try {
        const subdomain = domain.trim()
        const response = await authApiClient.checkDomainAvailability(subdomain, orgName.trim())
        
        if (response.ok && response.data) {
          const { available, suggestedUrl } = response.data as { available: boolean, suggestedUrl?: string[] }
          
          if (available) {
            const fullDomain = `${subdomain}.${SAAS_DOMAIN_SUFFIX}`
            onCreateOrganization(orgName.trim(), fullDomain, isSaasShared ? accessCode.trim() : '', orgEmail.trim())
          } else {
            toast({
              title: "Domain Not Available",
              description: `The subdomain '${subdomain}' is already taken. Please try another one.`,
              variant: "destructive"
            })
            
            if (suggestedUrl && suggestedUrl.length > 0) {
              const suggestions = suggestedUrl.map(url => url.replace(`.${SAAS_DOMAIN_SUFFIX}`, ''))
              setSuggestedDomains(suggestions)
            }
          }
        } else {
          throw new Error(response.error || 'Failed to check domain availability')
        }
      } catch (error) {
        console.error('Domain check error:', error)
        toast({
          title: "Error",
          description: "Failed to check domain availability. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsCheckingDomain(false)
      }
    } else {
      onCreateOrganization(orgName.trim(), domain || 'localhost', '', orgEmail.trim())
    }
  }

  const handleSignIn = async () => {
    if (isSignInEmailValid && !isSigningIn) {
      setIsSigningIn(true)
      try {
        await onSignIn(signInEmail.trim())
      } finally {
        setIsSigningIn(false)
      }
    }
  }

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
                onChange={(e) => setOrgEmail(e.target.value)}
                placeholder="username@mail.com"
                disabled={isLoading}
                className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && isOrgEmailValid && isOrgNameValid) {
                    handleCreateOrganization()
                  }
                }}
              />
              {orgEmail.trim() && !isOrgEmailValid && (
                <p className="text-xs text-error mt-1">Enter a valid email address</p>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label>Organization Name</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your Company Name"
                disabled={isLoading}
                className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && isOrgNameValid) {
                    handleCreateOrganization()
                  }
                }}
              />
              {orgName.trim() && !isOrgNameValid && (
                <p className="text-xs text-error mt-1">Organization Name must be 2-100 characters and may include letters, numbers, spaces, and &.,&apos;&quot;()-</p>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleCreateOrganization()
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    setDomain(value)
                    setSuggestedDomains([])
                  }}
                  placeholder="localhost"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleCreateOrganization()
                    }
                  }}
                  onChange={(e) => {
                    setDomain(e.target.value)
                    setSuggestedDomains([])
                  }}
                  placeholder="localhost"
                  disabled={isLoading}
                  className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                />
              )}
              {suggestedDomains.length > 0 && (
                <div className="text-sm text-ods-text-secondary">
                  <p className="mb-1">Available suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedDomains.map((suggestion, index) => (
                      <Button
                        key={index}
                        onClick={() => {
                          setDomain(suggestion)
                          setSuggestedDomains([])
                        }}
                        variant="outline"
                        size="sm"
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

          {/* Access Code field for SaaS shared mode */}
          {isSaasShared && (
            <div className="flex flex-col gap-1">
              <Label>Access Code</Label>
              <Input
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); if (accessCodeError) setAccessCodeError(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleCreateOrganization()
                  }
                }}
                placeholder="Enter Code Here"
                disabled={isLoading}
                className={`bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3 ${accessCodeError ? 'border-error' : ''}`}
              />
              {accessCodeError && (
                <p className="text-xs text-error mt-1">{accessCodeError}</p>
              )}
            </div>
          )}

          {/* Button Row */}
          <div className="flex gap-6 items-center">
            <div className="flex-1"></div>
            <div className="flex-1">
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName.trim() || !isOrgEmailValid || (isSaasShared && (!domain.trim() || !accessCode.trim())) || isLoading || isValidatingAccessCode || isCheckingDomain}
                loading={isLoading || isValidatingAccessCode || isCheckingDomain}
                variant="primary"
                className="!w-full sm:!w-full"
              >
                {isValidatingAccessCode ? 'Validating...' : isCheckingDomain ? 'Checking...' : 'Continue'}
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
              onChange={(e) => setSignInEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && isSignInEmailValid) {
                  handleSignIn()
                }
              }}
              placeholder="username@mail.com"
              disabled={isLoading}
              className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3 w-full"
            />
            {signInEmail.trim() && !isSignInEmailValid && (
              <p className="text-xs text-error mt-1">Enter a valid email address</p>
            )}
          </div>

          {/* Button Row with Forgot Password */}
          <div className="flex gap-6 items-center">
            <div className="flex-1 flex items-center">
              <Button
                onClick={() => setShowForgotPassword(true)}
                variant="ghost"
                className="!w-full sm:!w-full"
              >
                Forgot password?
              </Button>
            </div>
            <div className="flex-1">
              <Button
                onClick={handleSignIn}
                disabled={!isSignInEmailValid || isSigningIn || isLoading}
                loading={isSigningIn || isLoading}
                variant="primary"
                className="!w-full sm:!w-full"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
        defaultEmail={signInEmail}
      />
    </>
  )
}