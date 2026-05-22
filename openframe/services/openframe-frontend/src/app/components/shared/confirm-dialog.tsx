'use client';

import { Loading01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
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
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';

/**
 * ConfirmDialog — shared confirmation dialog for destructive and reversible
 * actions. Wraps the core lib `AlertDialog*` primitives with a single
 * configurable surface so every destructive flow looks and behaves the same.
 *
 * Parent owns the `open` state. The dialog does NOT auto-close on confirm —
 * the parent decides when to flip `open` to false (typically after the
 * mutation settles), which lets the pending state stay visible.
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` (red), `warning` (yellow), or `default` (accent) — controls confirm button color. */
  variant?: 'destructive' | 'warning' | 'default';
  isPending?: boolean;
  /** Label shown on the confirm button while `isPending` is true. */
  pendingLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Optional slot between description and footer (e.g. command box, single CTA). */
  extraContent?: ReactNode;
}

const CANCEL_BUTTON =
  'flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface disabled:opacity-50 disabled:pointer-events-none';

const CONFIRM_BUTTON_BASE =
  'flex-1 text-h3 px-4 py-3 rounded-[6px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none';

const CONFIRM_BUTTON_VARIANT = {
  destructive: 'bg-ods-error text-ods-bg hover:bg-ods-error/90',
  warning: 'bg-ods-warning text-ods-bg hover:bg-ods-warning/90',
  default: 'bg-ods-accent text-ods-text-on-accent hover:bg-ods-accent/90',
} as const;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  isPending = false,
  pendingLabel,
  onConfirm,
  extraContent,
}: ConfirmDialogProps) {
  const confirmText = isPending && pendingLabel ? pendingLabel : confirmLabel;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">{description}</AlertDialogDescription>
        {extraContent}
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel disabled={isPending} className={CANCEL_BUTTON}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={cn(CONFIRM_BUTTON_BASE, CONFIRM_BUTTON_VARIANT[variant])}
          >
            {isPending && <Loading01Icon size={20} className="animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
