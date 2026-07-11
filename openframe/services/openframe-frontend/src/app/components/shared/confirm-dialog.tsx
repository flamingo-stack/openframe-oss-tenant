'use client';

import {
  Button,
  ModalV2,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';

/**
 * ConfirmDialog — shared confirmation dialog for destructive and reversible
 * actions. Built directly on the `ModalV2*` primitives so it shares the
 * responsive layout (centered desktop / bottom-anchored mobile) with every
 * other modal in the app. Buttons are the core `Button` component. Adds three
 * confirm-button variants, pending state, and an `extraContent` slot for small
 * accompanying bits (CommandBox, picker, etc.).
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
  /**
   * @deprecated No-op. The confirm button now uses the core `Button`'s standard
   * `loading` state, which hides the label and shows a centered spinner while
   * `isPending` is true. Kept for backward compatibility with existing callers.
   */
  pendingLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Optional slot between description and footer (e.g. command box, single CTA). */
  extraContent?: ReactNode;
}

/**
 * Maps the dialog's intent to a core `Button` variant. `warning` has no
 * first-class Button variant, so it rides on `accent` with a token override.
 */
const CONFIRM_VARIANT: Record<
  NonNullable<ConfirmDialogProps['variant']>,
  { variant: 'accent' | 'destructive'; className?: string }
> = {
  destructive: { variant: 'destructive' },
  warning: { variant: 'accent', className: 'bg-ods-warning text-ods-bg hover:bg-ods-warning/90' },
  default: { variant: 'accent' },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  isPending = false,
  onConfirm,
  extraContent,
}: ConfirmDialogProps) {
  const handleClose = () => onOpenChange(false);
  const confirm = CONFIRM_VARIANT[variant];

  return (
    <ModalV2 isOpen={open} onClose={handleClose} className="text-left md:max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>{title}</ModalV2Title>
      </ModalV2Header>

      <p className="text-h4 text-ods-text-primary">{description}</p>
      {extraContent}

      <ModalV2Footer>
        <Button variant="outline" onClick={handleClose} disabled={isPending} className="flex-1">
          {cancelLabel}
        </Button>
        <Button
          variant={confirm.variant}
          onClick={onConfirm}
          loading={isPending}
          className={cn('flex-1', confirm.className)}
        >
          {confirmLabel}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
