'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@flamingo/ui-kit/components/ui'
import { useDeployment } from '@app/hooks/use-deployment'

interface AuthChoiceSectionProps {
  onCreateOrganization: (orgName: string, domain: string) => void
  onSignIn: (email: string) => Promise<void>
  isLoading?: boolean
}

/**
 * Auth choice section with Create Organization and Sign In forms
 * Matches Figma design exactly with proper colors, spacing, and typography
 */
export function AuthChoiceSection({ onCreateOrganization, onSignIn, isLoading }: AuthChoiceSectionProps) {
  const { isCloud, isSelfHosted, isDevelopment, hostname } = useDeployment()

  const [orgName, setOrgName] = useState('')
  const [domain, setDomain] = useState(isCloud ? '' : 'localhost')
  const [email, setEmail] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleCreateOrganization = () => {
    if (orgName.trim()) {
      onCreateOrganization(orgName.trim(), domain)
    }
  }

  const handleSignIn = async () => {
    if (email.trim() && !isSigningIn) {
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
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label>Domain</Label>
              <div className="relative">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder='Your domain'
                  disabled={!isCloud}
                  className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 p-3 pr-32"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ods-text-secondary font-body text-[14px] font-medium leading-5">
                  .openframe.ai
                </span>
              </div>
            </div>
          </div>

          {/* Button Row */}
          <div className="flex gap-6 items-center">
            <div className="flex-1"></div>
            <div className="flex-1">
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName.trim() || isLoading}
                loading={isLoading}
                variant="primary"
                className="w-full font-body text-[18px] font-bold leading-6 tracking-[-0.36px] py-3"
              >
                Continue
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
              placeholder="username@mail.com"
              disabled={isLoading}
              className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3 w-full"
            />
          </div>

          {/* Button Row */}
          <div className="flex gap-6 items-center">
            <div className="flex-1"></div>
            <div className="flex-1">
              <Button
                onClick={handleSignIn}
                disabled={!email.trim() || isSigningIn || isLoading}
                loading={isSigningIn || isLoading}
                variant="primary"
                className="w-full font-body text-[18px] font-bold leading-6 tracking-[-0.36px] py-3"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}