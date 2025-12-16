'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Input, Label, Card, CardContent, CardHeader } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { AuthLayout } from '../layouts'
import { authApiClient } from '@lib/auth-api-client'

export default function PasswordResetPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    if (!token) {
      toast({
        title: 'Invalid Reset Link',
        description: 'No reset token provided. Please use the link from your password reset email.',
        variant: 'destructive'
      })
      router.push('/auth')
    }
  }, [token, router, toast])
  
  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both password fields.',
        variant: 'destructive'
      })
      return
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords Don\'t Match',
        description: 'Please ensure both passwords are the same.',
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
      const response = await authApiClient.confirmPasswordReset({
        token: token!,
        newPassword: password
      })
      
      if (!response.ok) {
        const error = response.data as any
        throw new Error(error?.message || response.error || 'Failed to reset password')
      }
      
      toast({
        title: 'Password Reset Successful!',
        description: 'Your password has been updated. Redirecting to login...',
        variant: 'success'
      })
      
      setTimeout(() => {
        router.push('/auth')
      }, 2000)
    } catch (error) {
      console.error('Password reset error:', error)
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to reset password. Please try again or request a new reset link.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <AuthLayout>
      <div className="w-full">
        <Card className="bg-ods-card border-ods-border">
          <CardHeader>
            <h1 className="font-heading text-[32px] font-semibold text-ods-text-primary leading-10 tracking-[-0.64px] mb-2">
              Reset Your Password
            </h1>
            <p className="font-body text-[18px] font-medium text-ods-text-secondary leading-6">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Password Fields */}
              <div className="flex flex-col gap-1">
                <Label>New Password</Label>
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
              
              <div className="flex flex-col gap-1">
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
                  onClick={handleSubmit}
                  disabled={
                    !password || 
                    !confirmPassword || 
                    password !== confirmPassword ||
                    password.length < 8 ||
                    isLoading
                  }
                  loading={isLoading}
                  variant="primary"
                  className="w-full sm:flex-1"
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  )
}