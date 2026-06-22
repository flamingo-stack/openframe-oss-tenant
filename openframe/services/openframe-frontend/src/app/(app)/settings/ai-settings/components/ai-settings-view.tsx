'use client';

import { Button, CompactPageLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useState } from 'react';
import { useFaeSettings } from '../hooks/use-fae-settings';
import { useUpdateAiConfiguration } from '../hooks/use-update-ai-configuration';
import { useUpdateFaeSettings } from '../hooks/use-update-fae-settings';
import { getDefaultFaeSettings, type UpdateFaeSettingsInput } from '../types/fae-settings';
import { MINGO_AI_CHAT_FORM_ID } from '../types/mingo-ai-chat.types';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsLayout } from './ai-settings-layout';
import { type AiSettingsTabId, AiSettingsTabs, getVisibleAiSettingsTabs } from './ai-settings-tabs';
import { CUSTOMER_AI_ASSISTANT_FORM_ID, CustomerAiAssistantTab } from './customer-ai-assistant-tab';
import { GUARDRAILS_FORM_ID, GuardrailsTab } from './guardrails-tab';
import { MingoAiChatTab } from './mingo-ai-chat-tab';

const FORM_ID_BY_TAB: Record<AiSettingsTabId, string> = {
  customer: CUSTOMER_AI_ASSISTANT_FORM_ID,
  mingo: MINGO_AI_CHAT_FORM_ID,
  guardrails: GUARDRAILS_FORM_ID,
};

export function AiSettings() {
  const { settings: loadedSettings, isLoading, error, refetch } = useFaeSettings();
  const { update } = useUpdateFaeSettings();
  const { updateAiConfiguration } = useUpdateAiConfiguration();

  // No record yet → start from defaults so the first save creates one.
  const settings = loadedSettings ?? getDefaultFaeSettings();

  // Tabs are feature-flag gated; default to the first one that's visible.
  const visibleTabs = getVisibleAiSettingsTabs();
  const firstTabId = (visibleTabs[0]?.id as AiSettingsTabId | undefined) ?? 'guardrails';

  const [activeTab, setActiveTab] = useState<AiSettingsTabId>(firstTabId);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fall back to a visible tab if the active one is hidden by a flag.
  const effectiveTab: AiSettingsTabId = visibleTabs.some(tab => tab.id === activeTab) ? activeTab : firstTabId;

  const handleEdit = useCallback(() => setIsEditMode(true), []);

  // Switching tabs drops any in-progress edit back to the read-only view.
  const handleTabChange = useCallback((id: AiSettingsTabId) => {
    setActiveTab(id);
    setIsEditMode(false);
  }, []);
  const handleSave = useCallback(() => {
    const form = document.getElementById(FORM_ID_BY_TAB[effectiveTab]);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, [effectiveTab]);

  const handleFormSubmit = useCallback(
    (values: UpdateFaeSettingsInput) => {
      update(values, () => {
        if (
          values.llmProvider &&
          values.providerModel &&
          (values.llmProvider !== settings.llmProvider || values.providerModel !== settings.providerModel)
        ) {
          updateAiConfiguration({ provider: values.llmProvider, modelName: values.providerModel });
        }
        setIsEditMode(false);
      });
    },
    [update, updateAiConfiguration, settings.llmProvider, settings.providerModel],
  );

  const actions = useAiSettingsActions({
    isEditMode,
    onEdit: handleEdit,
    onSave: handleSave,
  });

  if (isLoading && !loadedSettings) {
    return (
      <AiSettingsLayout actions={actions}>
        <CompactPageLoader />
      </AiSettingsLayout>
    );
  }

  // Failed to load and nothing cached: show an error + retry instead of editable
  // defaults, so the user can't accidentally overwrite real settings on save.
  if (error && !loadedSettings) {
    return (
      <AiSettingsLayout>
        <div className="flex flex-col items-start gap-[var(--spacing-system-m)]">
          <p className="text-ods-text-secondary">
            Couldn't load AI settings. The service may be temporarily unavailable.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AiSettingsLayout>
    );
  }

  return (
    <AiSettingsLayout actions={actions} mobileBottomActions={isEditMode}>
      <AiSettingsTabs activeTab={effectiveTab} onTabChange={handleTabChange}>
        {activeId => {
          if (activeId === 'guardrails') {
            return <GuardrailsTab isEditMode={isEditMode} onSaved={() => setIsEditMode(false)} />;
          }

          if (activeId === 'customer') {
            return <CustomerAiAssistantTab settings={settings} isEditMode={isEditMode} onSubmit={handleFormSubmit} />;
          }

          return <MingoAiChatTab settings={settings} isEditMode={isEditMode} onSubmit={handleFormSubmit} />;
        }}
      </AiSettingsTabs>
    </AiSettingsLayout>
  );
}
