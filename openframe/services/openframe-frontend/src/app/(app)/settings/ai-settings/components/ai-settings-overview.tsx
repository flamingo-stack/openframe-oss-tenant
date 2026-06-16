'use client';

import { getFullImageUrl } from '@/lib/image-url';
import type { FaeQuickAction, FaeSettings } from '../types/fae-settings';
import { AiSettingsCustomerCard } from './ai-settings-customer-card';
import { AiSettingsQuickActions } from './ai-settings-quick-actions';
import { AiSettingsPreviews } from './previews/ai-settings-previews';

interface AiSettingsOverviewProps {
  /** Renders the assistant card + previews when provided. */
  settings?: FaeSettings;
  /** Display label for the provider model (resolved via useSupportedModels). */
  providerModelLabel?: string;
  /** Renders the quick actions list when provided. */
  quickActions?: FaeQuickAction[];
}

/**
 * Shared read-only view for the AI settings tabs. Each section renders only
 * when its data is passed, so tabs compose just the parts they need
 */
export function AiSettingsOverview({ settings, providerModelLabel, quickActions }: AiSettingsOverviewProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      {settings && (
        <>
          <AiSettingsCustomerCard settings={settings} providerModelLabel={providerModelLabel} />
          <AiSettingsPreviews
            assistantName={settings.assistantName}
            avatarUrl={getFullImageUrl(settings.assistantAvatar?.imageUrl, settings.assistantAvatar?.hash)}
            accentColor={settings.accentColor}
            theme={settings.applicationTheme}
            providerName={settings.llmProvider}
            modelDisplayName={providerModelLabel ?? settings.providerModel}
          />
        </>
      )}
      {quickActions && <AiSettingsQuickActions actions={quickActions} />}
    </div>
  );
}
