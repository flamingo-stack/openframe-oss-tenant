'use client';

import { useCallback, useState } from 'react';
import {
  CUSTOMER_AI_ASSISTANT_FORM_ID,
  CustomerAiAssistantForm,
  GUARDRAILS_FORM_ID,
  GuardrailsForm,
  MINGO_AI_CHAT_FORM_ID,
  MingoAiChatForm,
} from '../forms';
import { useFaeSettings } from '../hooks/use-fae-settings';
import type { UpdateFaeSettingsInput } from '../types/fae-settings';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsCustomerCard } from './ai-settings-customer-card';
import { AiSettingsLayout } from './ai-settings-layout';
import { AiSettingsQuickActions } from './ai-settings-quick-actions';
import { type AiSettingsTabId, AiSettingsTabs } from './ai-settings-tabs';
import { AiSettingsPreviews } from './previews/ai-settings-previews';

const FORM_ID_BY_TAB: Record<AiSettingsTabId, string> = {
  customer: CUSTOMER_AI_ASSISTANT_FORM_ID,
  mingo: MINGO_AI_CHAT_FORM_ID,
  guardrails: GUARDRAILS_FORM_ID,
};

export function AiSettings() {
  const { settings } = useFaeSettings();

  const [activeTab, setActiveTab] = useState<AiSettingsTabId>('customer');
  const [isEditMode, setIsEditMode] = useState(false);

  const handleEdit = useCallback(() => setIsEditMode(true), []);
  const handleCancel = useCallback(() => setIsEditMode(false), []);
  const handleSave = useCallback(() => {
    const form = document.getElementById(FORM_ID_BY_TAB[activeTab]);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, [activeTab]);

  const handleFormSubmit = useCallback((_values: UpdateFaeSettingsInput) => {
    // TODO: call updateFaeSettings mutation
    setIsEditMode(false);
  }, []);

  const actions = useAiSettingsActions({
    isEditMode,
    onEdit: handleEdit,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  return (
    <AiSettingsLayout actions={actions} mobileBottomActions={isEditMode}>
      <AiSettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeId => {
          if (isEditMode) {
            if (activeId === 'customer') {
              return <CustomerAiAssistantForm settings={settings} onSubmit={handleFormSubmit} />;
            }
            if (activeId === 'mingo') {
              return <MingoAiChatForm settings={settings} onSubmit={handleFormSubmit} />;
            }
            return <GuardrailsForm settings={settings} onSubmit={handleFormSubmit} />;
          }

          if (activeId === 'customer') {
            return (
              <div className="flex flex-col gap-[var(--spacing-system-l)]">
                <AiSettingsCustomerCard settings={settings} />
                <AiSettingsPreviews
                  assistantName={settings.assistantName}
                  avatarUrl={settings.assistantAvatar?.imageUrl}
                  accentColor={settings.accentColor}
                  theme={settings.applicationTheme}
                  providerName={settings.llmProvider}
                  modelDisplayName={settings.providerModel}
                />
                <AiSettingsQuickActions actions={settings.quickActions} />
              </div>
            );
          }

          return (
            <div>
              {/* TODO: render read-only content for {activeId} */}
              Active tab: {activeId}
            </div>
          );
        }}
      </AiSettingsTabs>
    </AiSettingsLayout>
  );
}
