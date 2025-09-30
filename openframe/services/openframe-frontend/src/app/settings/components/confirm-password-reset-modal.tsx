'use client'

import React from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@flamingo/ui-kit/components/ui'

interface ConfirmPasswordResetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userEmail: string
  onConfirm: () => Promise<void> | void
}

export function ConfirmPasswordResetModal({ open, onOpenChange, userName, userEmail, onConfirm }: ConfirmPasswordResetModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[48px] tracking-[-0.8px] text-ods-text-primary">
            Reset User Password
          </AlertDialogTitle>
          <AlertDialogDescription className="font-['DM_Sans'] text-[18px] leading-[24px] text-ods-text-primary">
            Are you sure you want to send a password reset link to <span className="font-semibold">{userName}</span>? 
            A reset link will be sent to <span className="font-mono text-sm">{userEmail}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()} className="flex-1 bg-ods-accent text-ods-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:opacity-90">
            Send Reset Link
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}