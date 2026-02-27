'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';

interface EmailVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onSubmit: () => Promise<void>;
  isSending: boolean;
}

export function EmailVerificationModal({
  open,
  onOpenChange,
  userEmail,
  onSubmit,
  isSending,
}: EmailVerificationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-ods-text-primary">
            Email Not Verified
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">
          Your email <span className="text-warning">{userEmail}</span> has not been verified yet. Would you like to
          resend the verification email?
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel
            disabled={isSending}
            className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSubmit}
            disabled={isSending}
            className="flex-1 bg-ods-accent text-ods-bg font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-accent/90"
          >
            {isSending ? 'Sending...' : 'Resend Verification'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
