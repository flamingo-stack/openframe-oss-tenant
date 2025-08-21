import { Button, Input } from '@flamingo/ui-kit/components/ui'
import { useState } from 'react'

interface RegisterRequest {
  tenantName: string
  tenantDomain: string
  firstName: string
  lastName: string
  email: string
  password: string
}

interface AuthSignupSectionProps {
  orgName: string
  domain: string
  onSubmit: (data: RegisterRequest) => void
  onBack: () => void
  isLoading: boolean
}

/**
 * Signup section for completing user registration
 */
export function AuthSignupSection({ orgName, domain, onSubmit, onBack, isLoading }: AuthSignupSectionProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || password !== confirmPassword) {
      return
    }

    const data: RegisterRequest = {
      tenantName: orgName,
      tenantDomain: domain,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password
    }

    onSubmit(data)
  }

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && 
                     password && confirmPassword && password === confirmPassword

  return (
    <div className="w-full lg:w-1/2 p-6 lg:p-20">
      <div className="w-full space-y-6 lg:space-y-10">
        
        {/* Complete Your Registration Section */}
        <div className="bg-ods-card border border-ods-border rounded-lg p-6 lg:p-10">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-4xl font-semibold text-ods-text-primary mb-2 tracking-tight">Complete Your Registration</h1>
            <p className="text-ods-text-secondary text-body-md lg:text-body-lg">Create your OpenFrame account.</p>
          </div>

          <div className="space-y-6">
            {/* Organization details (disabled) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Organization Name
                </label>
                <Input
                  value={orgName}
                  disabled
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
                    disabled
                    className="bg-ods-bg border-ods-border text-ods-text-secondary pr-32"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ods-text-secondary">
                    .openframe.ai
                  </span>
                </div>
              </div>
            </div>

            {/* Personal details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your First Name"
                  disabled={isLoading}
                  className="bg-ods-bg border-ods-border text-ods-text-secondary"
                />
              </div>
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your Last Name"
                  disabled={isLoading}
                  className="bg-ods-bg border-ods-border text-ods-text-secondary"
                />
              </div>
            </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a Strong Password"
                  disabled={isLoading}
                  className="bg-ods-bg border-ods-border text-ods-text-secondary"
                />
              </div>
              <div>
                <label className="block text-body-lg font-medium text-ods-text-primary mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your Password"
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
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
                loading={isLoading}
                variant="primary"
                className="w-full sm:flex-1"
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}