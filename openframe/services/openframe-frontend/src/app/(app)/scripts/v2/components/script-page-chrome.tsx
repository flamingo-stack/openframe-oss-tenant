'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import type { ActionsMenuGroup, PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';

interface ScriptPageChromeProps {
  title: string;
  /** Optional subtitle line under the title (e.g. an execution UUID). */
  subtitle?: string;
  /** Where Back navigates when the history stack is unsafe (see `useSafeBack`). */
  backFallback: string;
  actions: PageActionButton[];
  /** Overflow ("...") menu groups — see `PageLayout.menuActions`. */
  menuActions?: ActionsMenuGroup[];
  actionsVariant?: ComponentProps<typeof PageLayout>['actionsVariant'];
  /** `PageLayout` className — defaults to the standard page padding. */
  className?: string;
  children: ReactNode;
}

/**
 * Shared page chrome (title, subtitle, Back, header actions) for the script v2
 * pages (details, edit, run, execution details). Each page renders it for both
 * the loaded view and its Suspense fallback, so the chrome never remounts and
 * the loading state never duplicates it. The Back button is fully functional
 * while the page data is still loading.
 */
export function ScriptPageChrome({
  title,
  subtitle,
  backFallback,
  actions,
  menuActions,
  actionsVariant,
  className = 'px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]',
  children,
}: ScriptPageChromeProps) {
  const handleBack = useSafeBack(backFallback);
  const backButton = useMemo(() => ({ label: 'Back', onClick: handleBack }), [handleBack]);

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      backButton={backButton}
      actions={actions}
      menuActions={menuActions}
      actionsVariant={actionsVariant}
      className={className}
    >
      {children}
    </PageLayout>
  );
}
