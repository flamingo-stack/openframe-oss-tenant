'use client'

import { Button, Input, Label } from '@flamingo/ui-kit/components/ui'
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

interface TenantInfo {
  tenantName: string
  tenantDomain: string
}

interface SSOProvider {
  provider: string
  enabled: boolean
  displayName?: string
}

interface AuthLoginSectionProps {
  email: string
  tenantInfo: TenantInfo | null
  hasDiscoveredTenants: boolean
  availableProviders: string[]
  onSSO: (provider: string) => Promise<void>
  onBack: () => void
  isLoading: boolean
}

/**
 * Login section with SSO providers and password login
 */
export function AuthLoginSection({ 
  email, 
  tenantInfo, 
  hasDiscoveredTenants, 
  availableProviders, 
  onSSO, 
  onBack, 
  isLoading 
}: AuthLoginSectionProps) {
  const [password, setPassword] = useState('')

  const handlePasswordLogin = () => {
    // For now, we'll focus on SSO. Password login can be added later if needed
    console.log('Password login for:', email, password)
  }

  const enabledProviders: SSOProvider[] = availableProviders.map(provider => ({
    provider: provider === 'openframe-sso' ? 'google' : provider, // Map providers to UI kit format
    enabled: true,
    displayName: provider === 'openframe-sso' ? 'OpenFrame SSO' : 
                 provider === 'google' ? 'Google' : 
                 provider === 'microsoft' ? 'Microsoft' : 
                 provider.charAt(0).toUpperCase() + provider.slice(1)
  }))

  return (
    <div className="w-full">
      <div className="w-full space-y-6 lg:space-y-10">
        
        {/* Login Section */}
        <div className="bg-ods-card border border-ods-border rounded-sm p-10">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={onBack}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-ods-text-secondary hover:text-ods-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="truncate max-w-48">{email}</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px] mb-2">Sign In to Your Account</h1>
            <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">Access your OpenFrame organization.</p>
          </div>

          {/* Organization info */}
          {tenantInfo && (
            <div className="mb-6 p-3 bg-ods-bg-secondary rounded-lg border border-ods-border">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ods-text-secondary">Organization:</span>
                <span className="font-medium text-ods-text-primary">{tenantInfo.tenantName}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {hasDiscoveredTenants ? (
              <>
                {/* Email and Password */}
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 p-3"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your Password"
                      disabled={isLoading}
                      className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">
                  <Button
                    onClick={onBack}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full sm:flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePasswordLogin}
                    disabled={!password || isLoading}
                    loading={isLoading}
                    variant="primary"
                    className="w-full sm:flex-1"
                  >
                    Sign In
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-ods-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-ods-card text-ods-text-secondary">or sign in with SSO</span>
                  </div>
                </div>

                {/* SSO Providers */}
                <AuthProvidersList
                  enabledProviders={enabledProviders.map(p => ({ provider: p.provider, enabled: p.enabled }))}
                  onProviderClick={onSSO}
                  loading={isLoading}
                  orientation="vertical"
                  showDivider={false}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-heading-6 font-semibold text-ods-text-primary mb-2">No organizations found</h3>
                <p className="text-ods-text-secondary text-sm mb-6">
                  We couldn't find any organizations for this email address.
                </p>
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                >
                  Try a different email
                </Button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}