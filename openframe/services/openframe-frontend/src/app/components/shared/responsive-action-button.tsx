'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ComponentProps, ReactNode } from 'react';

type ButtonProps = ComponentProps<typeof Button>;

interface ResponsiveActionButtonProps {
  /** Visible label on desktop; also the aria-label for the icon-only mobile button. */
  label: string;
  /** Leading icon, rendered on both breakpoints. */
  icon: ReactNode;
  onClick?: ButtonProps['onClick'];
  variant?: ButtonProps['variant'];
  disabled?: boolean;
  /** Extra classes applied to both the desktop and mobile button. */
  className?: string;
}

/**
 * Action button that shows an icon + label on desktop (md+) and collapses to an
 * icon-only button on mobile. Implemented as two CSS-toggled buttons (`md:`) so
 * there is no SSR/hydration flash — mirrors the lib's PageActions icon-only
 * pattern.
 */
export function ResponsiveActionButton({
  label,
  icon,
  onClick,
  variant = 'outline',
  disabled,
  className,
}: ResponsiveActionButtonProps) {
  return (
    <>
      {/* Desktop: icon + label */}
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        leftIcon={icon}
        className={cn('hidden md:inline-flex', className)}
      >
        {label}
      </Button>
      {/* Mobile: icon only */}
      <Button
        variant={variant}
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        leftIcon={icon}
        className={cn('md:hidden', className)}
      />
    </>
  );
}
