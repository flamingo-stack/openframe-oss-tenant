'use client';

import { useCallback, useState } from 'react';
import { useFaeSettings } from '../hooks/use-fae-settings';
import type { UpdateFaeSettingsInput } from '../types/fae-settings';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsLayout } from './ai-settings-layout';
import { type AiSettingsTabId, AiSettingsTabs } from './ai-settings-tabs';
import { CUSTOMER_AI_ASSISTANT_FORM_ID, CustomerAiAssistantTab } from './customer-ai-assistant-tab';
import { GUARDRAILS_FORM_ID, GuardrailsTab } from './guardrails-tab';
import { MINGO_AI_CHAT_FORM_ID, MingoAiChatTab } from './mingo-ai-chat-tab';

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

  // Switching tabs drops any in-progress edit back to the read-only view.
  const handleTabChange = useCallback((id: AiSettingsTabId) => {
    setActiveTab(id);
    setIsEditMode(false);
  }, []);
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
      <AiSettingsTabs activeTab={activeTab} onTabChange={handleTabChange}>
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
