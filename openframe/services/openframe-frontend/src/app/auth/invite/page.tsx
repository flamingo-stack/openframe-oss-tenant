'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Input, Label, Card, CardContent, CardHeader, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'
import { AuthLayout } from '../layouts'
import { authApiClient } from '@lib/auth-api-client'
import { useInviteProviders } from '@app/auth/hooks/use-invite-providers'

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const invitationId = searchParams.get('id')
  const { providers: ssoProviders, loading: loadingProviders, error: providersError } = useInviteProviders(invitationId)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTenantSwitch, setShowTenantSwitch] = useState(false)
  const [, setSignupMethod] = useState<'form' | 'sso'>('form')
  const [invitationNotFound, setInvitationNotFound] = useState(false)

  useEffect(() => {
    if (!invitationId) {
      toast({
        title: 'Invalid Invitation',
        description: 'No invitation ID provided. Please use the link from your invitation email.',
        variant: 'destructive'
      })
      router.push('/auth')
    } else if (providersError && (providersError.includes('Invitation not found') || providersError.includes('Invitation already used or revoked'))) {
      setInvitationNotFound(true)
      toast({
        title: 'Invitation Not Found',
        description: 'This invitation link is invalid or has expired. Please contact your administrator for a new invitation.',
        variant: 'destructive'
      })
    }
  }, [invitationId, providersError, router, toast])

  const handleSubmit = async (switchTenant = false) => {
    if (!firstName.trim() || !lastName.trim() || !password || password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields and ensure passwords match.',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await authApiClient.acceptInvitation({
        invitationId: invitationId!,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        switchTenant
      })

      if (!response.ok) {
        const error = response.data as any

        if (error?.code === 'USER_IS_ACTIVE_IN_ANOTHER_TENANT') {
          setShowTenantSwitch(true)
          setIsLoading(false)
          return
        }

        throw new Error(error?.message || response.error || 'Failed to accept invitation')
      }

      toast({
        title: 'Invitation Accepted!',
        description: 'Your account has been created successfully. Redirecting to login...',
        variant: 'success'
      })

      setTimeout(() => {
        router.push('/auth')
      }, 2000)
    } catch (error) {
      console.error('Invitation acceptance error:', error)
      toast({
        title: 'Acceptance Failed',
        description: error instanceof Error ? error.message : 'Failed to accept invitation. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTenantSwitch = async () => {
    setShowTenantSwitch(false)
    await handleSubmit(true)
  }

  const handleSSOSignup = async (provider: string) => {
    setSignupMethod('sso')

    if (!invitationId) {
      toast({
        title: 'Invalid Invitation',
        description: 'No invitation ID provided.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      await authApiClient.acceptInvitationSSO({
        invitationId,
        provider: provider as 'google' | 'microsoft',
        switchTenant: true,
        redirectTo: '/auth/login'
      })
    } catch (error) {
      console.error('SSO signup error:', error)
      toast({
        title: 'SSO Signup Failed',
        description: 'Unable to initiate SSO signup. Please try again.',
        variant: 'destructive'
      })
      setIsLoading(false)
    }
  }

  if (loadingProviders) {
    return (
      <AuthLayout>
        <div className="w-full">
          <Card className="bg-ods-card border-ods-border">
            <CardHeader>
              <div className="animate-pulse space-y-2">
                <div className="h-10 w-72 bg-ods-border rounded" />
                <div className="h-6 w-96 bg-ods-border rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-6">
                {/* SSO Providers Loading */}
                <div className="space-y-3">
                  <div className="h-12 w-full bg-ods-border rounded" />
                  <div className="h-12 w-full bg-ods-border rounded" />
                </div>
                
                {/* Divider with text */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-ods-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-ods-card px-2">
                      <div className="h-4 w-32 bg-ods-border rounded" />
                    </span>
                  </div>
                </div>
                
                {/* Personal Details */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-ods-border rounded" />
                    <div className="h-12 w-full bg-ods-border rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-ods-border rounded" />
                    <div className="h-12 w-full bg-ods-border rounded" />
                  </div>
                </div>
                
                {/* Password Fields */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-ods-border rounded" />
                    <div className="h-12 w-full bg-ods-border rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-ods-border rounded" />
                    <div className="h-12 w-full bg-ods-border rounded" />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4">
                  <div className="h-12 flex-1 bg-ods-border rounded" />
                  <div className="h-12 flex-1 bg-ods-border rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    )
  }

  if (invitationNotFound) {
    return (
      <AuthLayout>
        <div className="w-full">
          <Card className="bg-ods-card border-ods-border">
            <CardHeader>
              <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px] mb-2">
                Invite link isn't valid
              </h1>
              <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">
                This invitation link has expired or is no longer valid. Contact your administrator for a new invitation.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 items-center">
                <div className="flex-1"></div>
                <div className="flex-1">
                  <Button
                    onClick={() => router.push('/auth')}
                    variant="primary"
                    className="!w-full sm:!w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <Card className="bg-ods-card border-ods-border">
          <CardHeader>
            <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px] mb-2">
              Accept Invitation
            </h1>
            <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">
              Complete your registration to join the organization
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* SSO Options */}
              {ssoProviders.length > 0 && (
                <div>
                  <AuthProvidersList
                    enabledProviders={ssoProviders}
                    onProviderClick={handleSSOSignup}
                    dividerText="Sign up with"
                    loading={isLoading || loadingProviders}
                  />
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-ods-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-ods-card px-2 text-ods-text-secondary">Or continue with email</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Personal Details */}
              <div className="flex flex-col md:flex-row gap-6" onClick={() => setSignupMethod('form')}>
                <div className="flex-1 flex flex-col gap-1">
                  <Label>First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your First Name"
                    disabled={isLoading}
                    className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <Label>Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your Last Name"
                    disabled={isLoading}
                    className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a Strong Password"
                    disabled={isLoading}
                    className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                  />
                  {password && password.length < 8 && (
                    <p className="text-xs text-error mt-1">Password must be at least 8 characters</p>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your Password"
                    disabled={isLoading}
                    className="bg-ods-card border-ods-border text-ods-text-secondary font-body text-[18px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-error mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center pt-4">
                <Button
                  onClick={() => router.push('/auth')}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full sm:flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !password ||
                    !confirmPassword ||
                    password !== confirmPassword ||
                    isLoading
                  }
                  loading={isLoading}
                  variant="primary"
                  className="w-full sm:flex-1"
                >
                  Accept Invitation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Switch Dialog */}
      <AlertDialog open={showTenantSwitch} onOpenChange={setShowTenantSwitch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              You are already registered in another organization. Would you like to switch to this new organization?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => setShowTenantSwitch(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTenantSwitch}
              variant="primary"
            >
              Yes, Switch Organization
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthLayout>
  )
}