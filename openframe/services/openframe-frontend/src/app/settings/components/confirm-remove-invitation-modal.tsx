'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@flamingo-stack/openframe-frontend-core/components/ui'

interface ConfirmRemoveInvitationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
  onConfirm: () => Promise<void> | void
}

export function ConfirmRemoveInvitationModal({ open, onOpenChange, userEmail, onConfirm }: ConfirmRemoveInvitationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-ods-text-primary">
            Remove Invitation
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">
          This will permanently delete the expired invitation for <span className="text-error">{userEmail}</span> from your list.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="flex-1 bg-error text-ods-bg font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-error/90">
            Remove Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
