'use client';

import { Chevron02LeftIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, type PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';

interface AiSettingsLayoutProps {
  children: ReactNode;
  actions?: PageActionButton[];
  selector?: ReactNode;
  /**
   * When true, actions render in a fixed bottom bar on mobile (full-width
   * buttons) instead of icon-only in the header. Use for the edit-mode Save
   * action; leave false when there's a single Edit action.
   */
  mobileBottomActions?: boolean;
}

export function AiSettingsLayout({ children, actions, selector, mobileBottomActions = false }: AiSettingsLayoutProps) {
  const handleBack = useSafeBack(routes.settings.root());
  const hasActions = !!actions && actions.length > 0;
  const useMobileBottomBar = mobileBottomActions && hasActions;

  // Cancel (outline) first, accent (Save) last — matches the Figma mobile
  // bottom-bar order regardless of how the caller ordered the actions.
  const bottomBarActions = useMobileBottomBar
    ? [...(actions ?? [])].sort((a, b) => {
        if (a.variant === 'accent' && b.variant !== 'accent') return 1;
        if (a.variant !== 'accent' && b.variant === 'accent') return -1;
        return 0;
      })
    : [];

  return (
    <div
      className={cn(
        'flex flex-col w-full px-[var(--spacing-system-l)]',
        useMobileBottomBar ? 'pb-24 md:pb-[var(--spacing-system-l)]' : 'pb-[var(--spacing-system-l)]',
      )}
    >
      <header className="flex items-end justify-between gap-[var(--spacing-system-m)] pt-[var(--spacing-system-l)] mb-[var(--spacing-system-l)]">
        <div className="flex flex-col gap-[var(--spacing-system-xs)] flex-1 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="hidden md:inline-flex group items-center justify-center self-start rounded-md gap-[var(--spacing-system-xsf)] py-[var(--spacing-system-sf)] text-ods-text-secondary hover:text-ods-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ods-focus"
          >
            <Chevron02LeftIcon className="size-6 shrink-0" />
            <span className="text-h4">Back</span>
          </button>
          <h1 className="text-h2 text-ods-text-primary truncate">
            AI Settings<span className="hidden md:inline"> &amp; Guardrails</span>
          </h1>
        </div>
        {(hasActions || selector) && (
          <div className="flex gap-[var(--spacing-system-xs)] items-center shrink-0">
            {selector}
            {actions?.map((action, idx) => (
              <ResponsiveAction
                key={`${action.label ?? action.ariaLabel ?? 'action'}-${idx}`}
                action={action}
                hideMobileIcon={useMobileBottomBar}
              />
            ))}
          </div>
        )}
      </header>

      {children}

      {useMobileBottomBar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ods-card border-t border-ods-border flex items-start gap-4 p-4">
          {bottomBarActions.map((action, idx) => (
            <Button
              key={`mobile-${action.label ?? action.ariaLabel ?? 'action'}-${idx}`}
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.disabled}
              loading={action.loading}
              fullWidth
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponsiveAction({ action, hideMobileIcon }: { action: PageActionButton; hideMobileIcon: boolean }) {
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
      {!hideMobileIcon && (
        <Button
          variant={action.variant}
          onClick={action.onClick}
          disabled={action.disabled}
          loading={action.loading}
          leftIcon={action.icon}
          size="icon"
          aria-label={action.ariaLabel ?? action.label}
          className="md:hidden [&_svg]:!text-ods-text-primary"
        />
      )}
    </>
  );
}
