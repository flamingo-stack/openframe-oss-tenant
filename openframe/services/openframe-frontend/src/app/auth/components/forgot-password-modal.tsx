'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({ open, onOpenChange, defaultEmail = '' }: ForgotPasswordModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApiClient.requestPasswordReset({ email: email.trim() });

      if (response.ok) {
        toast({
          title: 'Reset Link Sent',
          description: `A password reset link has been sent to ${email.trim()}. Please check your inbox.`,
          variant: 'success',
          duration: 5000,
        });
        onOpenChange(false);
        setEmail('');
      } else {
        throw new Error(response.error || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Unable to send password reset link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setEmail(defaultEmail);
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-[24px] font-semibold text-ods-text-primary leading-8 tracking-[-0.48px]">
            Reset Your Password
          </AlertDialogTitle>
          <AlertDialogDescription className="font-body text-[16px] font-medium text-ods-text-secondary leading-6 mt-2">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-6">
          <Label htmlFor="reset-email" className="text-ods-text-primary">
            Email Address
          </Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="username@mail.com"
            disabled={isSubmitting}
            className="mt-2 bg-ods-card border-ods-border text-ods-text-primary font-body text-[16px] font-medium leading-6 placeholder:text-ods-text-secondary p-3"
            onKeyDown={e => {
              if (e.key === 'Enter' && !isSubmitting) {
                handleSubmit();
              }
            }}
          />
        </div>

        <AlertDialogFooter className="mt-6 gap-4">
          <Button
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-body font-bold text-[16px] leading-6 px-4 py-2.5 rounded-[6px] hover:bg-ods-bg-hover"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || isSubmitting}
            loading={isSubmitting}
            className="flex-1 bg-ods-accent text-ods-text-on-accent font-body font-bold text-[16px] leading-6 px-4 py-2.5 rounded-[6px] hover:opacity-90"
          >
            Send Reset Link
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
