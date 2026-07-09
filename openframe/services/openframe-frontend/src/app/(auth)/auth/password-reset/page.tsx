'use client';

import {
  AuthShell,
  BackToLoginLink,
  PasswordResetForm,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';

const MIN_PASSWORD_LENGTH = 8;

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Invalid Reset Link',
        description: 'No reset token provided. Please use the link from your password reset email.',
        variant: 'destructive',
      });
      router.push('/auth');
    }
  }, [token, router, toast]);

  const isTooShort = !!password && password.length < MIN_PASSWORD_LENGTH;
  const isMismatch = !!confirmPassword && password !== confirmPassword;
  const isValid = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleBack = () => router.push('/auth');

  const handleSubmit = async () => {
    if (!token || !isValid) return;

    setIsLoading(true);

    try {
      const response = await authApiClient.confirmPasswordReset({
        token,
        newPassword: password,
      });

      if (!response.ok) {
        const error = response.data as any;
        throw new Error(error?.message || response.error || 'Failed to reset password');
      }

      toast({
        title: 'Password Reset Successful!',
        description: 'Your password has been updated. Redirecting to login...',
        variant: 'success',
      });

      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to reset password. Please try again or request a new reset link.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell footer={<BackToLoginLink onClick={handleBack} />}>
      <PasswordResetForm
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        onBackToLogin={handleBack}
        submitDisabled={!isValid}
        loading={isLoading}
        errors={{
          password: isTooShort ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters` : undefined,
          confirmPassword: isMismatch ? 'Passwords do not match' : undefined,
        }}
      />
    </AuthShell>
  );
}
