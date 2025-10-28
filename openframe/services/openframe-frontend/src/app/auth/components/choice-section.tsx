'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { isSaasSharedMode } from '@lib/app-mode'
import { authApiClient, SAAS_DOMAIN_SUFFIX } from '@lib/auth-api-client'
import { ForgotPasswordModal } from './forgot-password-modal'

interface AuthChoiceSectionProps {
  onCreateOrganization: (orgName: string, domain: string) => void
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
  const [email, setEmail] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCheckingDomain, setIsCheckingDomain] = useState(false)
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([])
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const orgNameRegex = /^[\p{L}\p{M}0-9&\.,'"()\- ]{2,100}$/u
  const isOrgNameValid = orgNameRegex.test(orgName.trim())

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = emailRegex.test(email.trim())

  const handleCreateOrganization = async () => {
    if (!orgName.trim() || !isOrgNameValid) return

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
            onCreateOrganization(orgName.trim(), fullDomain)
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
      onCreateOrganization(orgName.trim(), domain || 'localhost')
    }
  }

  const handleSignIn = async () => {
    if (isEmailValid && !isSigningIn) {
      setIsSigningIn(true)
      try {
        await onSignIn(email.trim())
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

          {/* Form Fields */}
          <div className="flex flex-col md:flex-row gap-6">
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
            <div className="flex-1 flex flex-col gap-1">
              <Label>{isSaasShared ? 'Subdomain' : 'Domain'}</Label>
              <div className="flex flex-col gap-2">
                {isSaasShared ? (
                  <div className="flex items-center bg-ods-card border border-ods-border rounded-lg min-h-[60px] overflow-hidden">
                    <input
                      type="text"
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
                      placeholder="your-company"
                      disabled={isLoading}
                      className="flex-grow w-full bg-transparent text-ods-text-secondary font-body text-[18px] font-medium placeholder:text-ods-text-secondary px-3 py-2 outline-none focus:outline-none"
                    />
                    <span className="text-ods-text-secondary font-body text-[18px] font-medium pr-1 py-2 flex-shrink-0 whitespace-nowrap select-none">
                      .{SAAS_DOMAIN_SUFFIX}
                    </span>
                  </div>
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
          </div>

          {/* Button Row */}
          <div className="flex gap-6 items-center">
            <div className="flex-1"></div>
            <div className="flex-1">
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName.trim() || (isSaasShared && !domain.trim()) || isLoading || isCheckingDomain}
                loading={isLoading || isCheckingDomain}
                variant="primary"
                className="!w-full sm:!w-full"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && isEmailValid) {
                  handleSignIn()
                }
              }}
              placeholder="username@mail.com"
              disabled={isLoading}
              className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3 w-full"
            />
            {email.trim() && !isEmailValid && (
              <p className="text-xs text-error mt-1">Enter a valid email address</p>
            )}
          </div>

          {/* Button Row with Forgot Password */}
          <div className="flex gap-6 items-center">
            <div className="flex-1 flex items-center">
              <Button
                onClick={() => setShowForgotPassword(true)}
                variant="ghost"
                className="text-ods-text-secondary hover:text-ods-accent font-body text-[14px] font-medium leading-5 p-0 h-auto"
              >
                Forgot password?
              </Button>
            </div>
            <div className="flex-1">
              <Button
                onClick={handleSignIn}
                disabled={!isEmailValid || isSigningIn || isLoading}
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
        defaultEmail={email}
      />
    </>
  )
}