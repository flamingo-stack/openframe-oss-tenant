'use client';

import { EntityImage, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { AiSettingsPreviews } from '@/app/(app)/settings/ai-settings/components/previews/ai-settings-previews';
import { useClientView } from '@/app/(app)/settings/ai-settings/hooks/use-client-view';
import { APPLICATION_THEME_LABEL } from '@/app/(app)/settings/ai-settings/utils/ai-settings-display';
import { InfoCell } from '@/app/components/shared/info-cell';
import { getFullImageUrl } from '@/lib/image-url';

interface CustomerCustomAiAssistantTabProps {
  organizationId: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

/**
 * Read-only view of a customer's custom AI-Assistant appearance (org-scoped
 * ClientView override). Shown as a tab on the customer details page only when an
 * override exists; editing happens on /customers/edit.
 */
export function CustomerCustomAiAssistantTab({ organizationId }: CustomerCustomAiAssistantTabProps) {
  // Shares the react-query cache with the parent's visibility check.
  const { view, isLoading } = useClientView(organizationId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        <Skeleton className="h-40 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  // The tab is only mounted when an override exists, but guard defensively.
  if (!view) {
    return null;
  }

  const avatarUrl = getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <div className="rounded-md border border-ods-border bg-ods-card">
        <div className={cn(CELL, 'border-b border-ods-border')}>
          {/* EntityImage defaults to size-[52px] md:size-[60px]; override both
              breakpoints so the avatar stays 40×40. */}
          <EntityImage src={avatarUrl} alt={view.assistantName} className="size-10 md:size-10 rounded-full" />
          <InfoCell value={view.assistantName} label="Custom Assistant Name" />
        </div>

        <div className="grid grid-cols-2">
          <div className={CELL}>
            <InfoCell value={APPLICATION_THEME_LABEL[view.applicationTheme]} label="Custom Application Theme" />
          </div>
          <div className={CELL}>
            <InfoCell value={view.accentColor?.toUpperCase()} label="Custom Accent Color" />
          </div>
        </div>
      </div>

      <AiSettingsPreviews
        assistantName={view.assistantName}
        avatarUrl={avatarUrl}
        accentColor={view.accentColor}
        theme={view.applicationTheme}
      />
    </div>
  );
}
