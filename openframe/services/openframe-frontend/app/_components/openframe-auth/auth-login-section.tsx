'use client'

import { Button } from '@flamingo/ui-kit/components/ui'
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'
import { ArrowLeft } from 'lucide-react'

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
 * Login section with SSO providers
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

  // Separate OpenFrame SSO from standard providers
  const hasOpenFrameSSO = availableProviders.includes('openframe-sso')
  const standardProviders = availableProviders.filter(provider => provider !== 'openframe-sso')
  
  const enabledProviders: SSOProvider[] = standardProviders.map(provider => ({
    provider: provider, // Use actual provider name
    enabled: true,
    displayName: provider === 'google' ? 'Google' : 
                 provider === 'microsoft' ? 'Microsoft' : 
                 provider === 'slack' ? 'Slack' :
                 provider === 'github' ? 'GitHub' :
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


          <div className="space-y-6">
            {hasDiscoveredTenants ? (
              <>
                {/* SSO Login Options */}
                <div className="space-y-6">
                  {/* OpenFrame SSO Button */}
                  {hasOpenFrameSSO && (
                    <Button
                      onClick={() => onSSO('openframe-sso')}
                      disabled={isLoading}
                      loading={isLoading}
                      variant="primary"
                      className="w-full"
                    >
                      Sign in with OpenFrame SSO
                    </Button>
                  )}

                  {/* Standard SSO Providers */}
                  {enabledProviders.length > 0 && (
                    <AuthProvidersList
                      enabledProviders={enabledProviders.map(p => ({ provider: p.provider, enabled: p.enabled }))}
                      onProviderClick={onSSO}
                      loading={isLoading}
                      orientation="vertical"
                      showDivider={false}
                    />
                  )}

                  {/* Back Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={onBack}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      Back
                    </Button>
                  </div>
                </div>
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