import { Button, Input } from '@flamingo/ui-kit/components/ui'
import { useState } from 'react'

interface AuthChoiceSectionProps {
  onCreateOrganization: (orgName: string, domain: string) => void
  onSignIn: (email: string) => void
  isLoading: boolean
}

/**
 * Auth choice section with Create Organization and Sign In forms
 */
export function AuthChoiceSection({ onCreateOrganization, onSignIn, isLoading }: AuthChoiceSectionProps) {
  const [orgName, setOrgName] = useState('')
  const [domain, setDomain] = useState('localhost')
  const [email, setEmail] = useState('')

  const handleCreateOrganization = () => {
    if (orgName.trim()) {
      onCreateOrganization(orgName.trim(), domain)
    }
  }

  const handleSignIn = () => {
    if (email.trim()) {
      onSignIn(email.trim())
    }
  }

  return (
    <div className="w-full lg:w-1/2 p-6 lg:p-20">
      <div className="w-full space-y-6 lg:space-y-10">
        
        {/* Create Organization Section */}
        <div className="bg-ods-card border border-ods-border rounded-lg p-6 lg:p-10">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-4xl font-semibold text-ods-text-primary mb-2 tracking-tight">Create Organization</h1>
            <p className="text-ods-text-secondary text-body-md lg:text-body-lg">Start your journey with OpenFrame.</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Organization Name
                </label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your Company Name"
                  disabled={isLoading}
                  className="bg-ods-bg border-ods-border text-ods-text-secondary"
                />
              </div>
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Domain
                </label>
                <div className="relative">
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={true}
                    className="bg-ods-bg border-ods-border text-ods-text-secondary pr-32"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ods-text-secondary">
                    .openframe.ai
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">
              <div className="hidden sm:block sm:flex-1"></div>
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName.trim() || isLoading}
                loading={isLoading}
                variant="primary"
                className="w-full sm:flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>

        {/* Already Have an Account Section */}
        <div className="bg-ods-bg-secondary border border-ods-border rounded-lg p-6 lg:p-10">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-4xl font-semibold text-ods-text-primary mb-2 tracking-tight">Already Have an Account?</h1>
            <p className="text-ods-text-secondary text-body-md lg:text-body-lg">Enter you email to access your organization.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@mail.com"
                disabled={isLoading}
                className="bg-ods-bg border-ods-border text-ods-text-secondary"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">
              <div className="hidden sm:block sm:flex-1"></div>
              <Button
                onClick={handleSignIn}
                disabled={!email.trim() || isLoading}
                loading={isLoading}
                variant="primary"
                className="w-full sm:flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}