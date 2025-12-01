'use client'

import React from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@flamingo/ui-kit/components/ui'

interface ConfirmDeleteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onConfirm: () => Promise<void> | void
}

export function ConfirmDeleteUserModal({ open, onOpenChange, userName, onConfirm }: ConfirmDeleteUserModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[48px] tracking-[-0.8px] text-ods-text-primary">
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="font-['DM_Sans'] text-[18px] leading-[24px] text-ods-text-primary">
            Confirm the deletion of the <span className="text-error">{userName}</span> user. This user will no longer have access to the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()} className="flex-1 border border-error text-error bg-transparent hover:bg-error/10 font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px]">
            Delete User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


