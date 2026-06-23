'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';

export interface AlertProps {
  /** Leading icon. Inherits the warning color via `currentColor` — size it on the icon (e.g. `w-6 h-6`). */
  icon: ReactNode;
  /** Alert message. */
  title: ReactNode;
  /** Extra classes merged onto the container (e.g. spacing overrides). */
  className?: string;
}

/**
 * Warning alert box — a colored container with a leading icon and bold title.
 *
 * The warning color is applied at the root so both the icon (via `currentColor`)
 * and the title inherit it; callers only pass the icon node and the title.
 */
export function Alert({ icon, title, className }: AlertProps) {
  return (
    <div
      className={cn(
        'flex gap-[var(--spacing-system-m)] items-start rounded-[6px] p-[var(--spacing-system-m)]',
        'bg-[var(--ods-attention-yellow-warning-secondary)] text-[var(--ods-attention-yellow-warning)]',
        className,
      )}
    >
      <span className="shrink-0">{icon}</span>
      <p className="text-h3">{title}</p>
    </div>
  );
}
