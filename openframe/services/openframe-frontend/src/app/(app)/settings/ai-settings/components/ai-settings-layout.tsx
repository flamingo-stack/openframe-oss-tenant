'use client';

import { PageLayout, type PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';

interface AiSettingsLayoutProps {
  children: ReactNode;
  actions?: PageActionButton[];
  selector?: ReactNode;
}

export function AiSettingsLayout({ children, actions, selector }: AiSettingsLayoutProps) {
  const handleBack = useSafeBack('/settings');

  return (
    <PageLayout
      title="AI Settings & Guardrails"
      backButton={{ label: 'Back to Settings', onClick: handleBack }}
      actions={actions}
      actionsVariant="primary-buttons"
      selector={selector}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {children}
    </PageLayout>
  );
}