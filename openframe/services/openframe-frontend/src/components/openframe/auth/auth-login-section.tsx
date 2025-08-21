import { Button, Input } from '@flamingo/ui-kit/components/ui'
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { TenantInfo, SSOProvider } from '@/types/auth'

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
    <div className="w-full lg:w-1/2 p-6 lg:p-20">
      <div className="w-full space-y-6 lg:space-y-10">
        
        {/* Login Section */}
        <div className="bg-ods-card border border-ods-border rounded-lg p-6 lg:p-10">
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
            <h1 className="text-2xl lg:text-4xl font-semibold text-ods-text-primary mb-2 tracking-tight">Sign In to Your Account</h1>
            <p className="text-ods-text-secondary text-body-md lg:text-body-lg">Access your OpenFrame organization.</p>
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
                  <div>
                    <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="bg-ods-bg border-ods-border text-ods-text-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your Password"
                      disabled={isLoading}
                      className="bg-ods-bg border-ods-border text-ods-text-secondary"
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