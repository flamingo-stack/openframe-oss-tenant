'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Input, Label, Card, CardContent, CardHeader, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { AuthLayout } from '../layouts'
import { authApiClient } from '@lib/auth-api-client'

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const invitationId = searchParams.get('id')
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTenantSwitch, setShowTenantSwitch] = useState(false)
  
  useEffect(() => {
    if (!invitationId) {
      toast({
        title: 'Invalid Invitation',
        description: 'No invitation ID provided. Please use the link from your invitation email.',
        variant: 'destructive'
      })
      router.push('/auth')
    }
  }, [invitationId, router, toast])
  
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
              {/* Personal Details */}
              <div className="flex flex-col md:flex-row gap-6">
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