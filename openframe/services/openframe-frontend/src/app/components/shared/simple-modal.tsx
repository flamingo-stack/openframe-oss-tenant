'use client';

import {
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';

/**
 * SimpleModal — slot-based wrapper over `ModalV2*` primitives. Renders each
 * section (header, content, footer) conditionally based on what you pass.
 *
 * - `title` (string) is the common case → wrapped in ModalV2Header + ModalV2Title.
 * - `header` (ReactNode) lets you supply a fully custom header (overrides `title`).
 * - `contentClassName` wraps `children` in ModalV2Content with that className
 *   (gives the body `flex-1 min-h-0 overflow-y-auto` so long content scrolls).
 *   Omit it for short modals — children flow as direct flex-column items.
 * - `footer` is rendered inside ModalV2Footer (typically Cancel + primary button).
 * - `className` is passed through to the outer ModalV2 (e.g. `md:max-w-[600px]`).
 *
 * For confirm/destructive flows prefer `<ConfirmDialog>` — it wraps SimpleModal
 * with built-in variant button styling and pending state.
 */
interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  header?: ReactNode;
  children?: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  className?: string;
}

export function SimpleModal({
  isOpen,
  onClose,
  title,
  header,
  children,
  contentClassName,
  footer,
  className,
}: SimpleModalProps) {
  const headerContent = header ?? (title !== undefined ? <ModalV2Title>{title}</ModalV2Title> : null);

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className={className}>
      {headerContent && <ModalV2Header>{headerContent}</ModalV2Header>}
      {children !== undefined &&
        (contentClassName !== undefined ? (
          <ModalV2Content className={contentClassName}>{children}</ModalV2Content>
        ) : (
          children
        ))}
      {footer && <ModalV2Footer>{footer}</ModalV2Footer>}
    </ModalV2>
  );
}
