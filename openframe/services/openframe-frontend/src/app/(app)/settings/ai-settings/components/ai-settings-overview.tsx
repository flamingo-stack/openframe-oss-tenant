'use client';

import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import type { AgentAiConfig, AiQuickAction, ClientView } from '../types/ai-settings';
import { AiSettingsCustomerCard } from './ai-settings-customer-card';
import { AiSettingsQuickActions } from './ai-settings-quick-actions';
import { AiSettingsPreviews } from './previews/ai-settings-previews';

interface AiSettingsOverviewProps {
  /** AI logic config for the active agent. */
  aiConfig?: AgentAiConfig;
  /** Client view (appearance). Present only for the CLIENT tab. */
  view?: ClientView;
  /** Display label for the provider model (resolved via useSupportedModels). */
  providerModelLabel?: string;
  /** Renders the quick actions list when provided. */
  quickActions?: AiQuickAction[];
}

/**
 * Shared read-only view for the AI settings tabs. The CLIENT tab passes both
 * `aiConfig` and `view` (full card + previews); the ADMIN/Mingo tab passes only
 * `quickActions` (its provider/model is rendered separately by AiModelConfig).
 */
export function AiSettingsOverview({ aiConfig, view, providerModelLabel, quickActions }: AiSettingsOverviewProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      {aiConfig && view && (
        <>
          <AiSettingsCustomerCard aiConfig={aiConfig} view={view} providerModelLabel={providerModelLabel} />
          {/* Previews are part of the not-yet-released AI customization. */}
          {featureFlags.customerAiAssistantSettings.enabled() && (
            <AiSettingsPreviews
              assistantName={view.assistantName}
              avatarUrl={getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash)}
              accentColor={view.accentColor}
              theme={view.applicationTheme}
              providerName={aiConfig.llmProvider}
              modelDisplayName={providerModelLabel ?? aiConfig.providerModel}
            />
          )}
        </>
      )}
      {/* Quick actions are part of the not-yet-released AI customization. */}
      {featureFlags.customerAiAssistantSettings.enabled() && quickActions && (
        <AiSettingsQuickActions actions={quickActions} />
      )}
    </div>
  );
}
