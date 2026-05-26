'use client';

import { Chevron02LeftIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, type PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';

interface AiSettingsLayoutProps {
  children: ReactNode;
  actions?: PageActionButton[];
  selector?: ReactNode;
}

export function AiSettingsLayout({ children, actions, selector }: AiSettingsLayoutProps) {
  const handleBack = useSafeBack('/settings');
  const hasActions = !!actions && actions.length > 0;

  return (
    <div className="flex flex-col w-full px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]">
      <header className="flex items-end justify-between gap-[var(--spacing-system-m)] pt-[var(--spacing-system-l)] mb-[var(--spacing-system-l)]">
        <div className="flex flex-col gap-[var(--spacing-system-xs)] flex-1 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="hidden md:inline-flex group items-center justify-center self-start rounded-md gap-[var(--spacing-system-xsf)] py-[var(--spacing-system-sf)] text-ods-text-secondary hover:text-ods-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ods-focus"
          >
            <Chevron02LeftIcon className="size-6 shrink-0" />
            <span className="text-h4">Back to Settings</span>
          </button>
          <h1 className="text-h2 text-ods-text-primary truncate">
            AI Settings<span className="hidden md:inline"> &amp; Guardrails</span>
          </h1>
        </div>
        {(hasActions || selector) && (
          <div className="flex gap-[var(--spacing-system-xs)] items-center shrink-0">
            {selector}
            {actions?.map((action, idx) => (
              <ResponsiveAction key={`${action.label ?? action.ariaLabel ?? 'action'}-${idx}`} action={action} />
            ))}
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

function ResponsiveAction({ action }: { action: PageActionButton }) {
  return (
    <>
      <Button
        variant={action.variant}
        onClick={action.onClick}
        disabled={action.disabled}
        loading={action.loading}
        leftIcon={action.icon}
        className="hidden md:inline-flex"
      >
        {action.label}
      </Button>
      <Button
        variant={action.variant}
        onClick={action.onClick}
        disabled={action.disabled}
        loading={action.loading}
        leftIcon={action.icon}
        size="icon"
        aria-label={action.label ?? action.ariaLabel}
        className="md:hidden [&_svg]:!text-ods-text-primary"
      />
    </>
  );
}
