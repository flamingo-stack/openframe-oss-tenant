'use client';

import { Loading01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { SimpleModal } from './simple-modal';

/**
 * ConfirmDialog — shared confirmation dialog for destructive and reversible
 * actions. Built on top of `SimpleModal` so it shares the responsive layout
 * (centered desktop / bottom-anchored mobile) with every other modal in the
 * app. Adds three confirm-button variants, pending state, and an
 * `extraContent` slot for small accompanying bits (CommandBox, picker, etc.).
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
  'flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-[var(--spacing-system-mf)] py-[var(--spacing-system-sf)] rounded-[6px] hover:bg-ods-bg-surface disabled:opacity-50 disabled:pointer-events-none';

const CONFIRM_BUTTON_BASE =
  'flex-1 text-h3 px-[var(--spacing-system-mf)] py-[var(--spacing-system-sf)] rounded-[6px] inline-flex items-center justify-center gap-[var(--spacing-system-xsf)] disabled:opacity-50 disabled:pointer-events-none';

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
  const handleClose = () => onOpenChange(false);

  return (
    <SimpleModal
      isOpen={open}
      onClose={handleClose}
      className="md:max-w-[600px] text-left"
      title={title}
      footer={
        <>
          <button type="button" onClick={handleClose} disabled={isPending} className={CANCEL_BUTTON}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(CONFIRM_BUTTON_BASE, CONFIRM_BUTTON_VARIANT[variant])}
          >
            {isPending && <Loading01Icon size={20} className="animate-spin" />}
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">{description}</p>
      {extraContent}
    </SimpleModal>
  );
}
