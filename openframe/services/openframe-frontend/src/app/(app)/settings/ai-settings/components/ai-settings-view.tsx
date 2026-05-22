'use client';

import { useCallback, useState } from 'react';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsCustomerCard } from './ai-settings-customer-card';
import { AiSettingsLayout } from './ai-settings-layout';
import { type AiSettingsTabId, AiSettingsTabs } from './ai-settings-tabs';

export function AiSettings() {
  const [activeTab, setActiveTab] = useState<AiSettingsTabId>('customer');
  const [isEditMode, setIsEditMode] = useState(false);

  const handleEdit = useCallback(() => setIsEditMode(true), []);
  const handleSave = useCallback(() => {
    // TODO: wire up save mutation
    setIsEditMode(false);
  }, []);
  const handleCancel = useCallback(() => setIsEditMode(false), []);

  const actions = useAiSettingsActions({
    isEditMode,
    onEdit: handleEdit,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  return (
    <AiSettingsLayout actions={actions}>
      <AiSettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeId => {
          if (activeId === 'customer') {
            return (
              <AiSettingsCustomerCard
                assistantName="Grace “Fae” Meadows"
                llmProvider="Anthropic"
                providerModel="Claude Opus 4.1"
                answerStyle="Short"
                applicationTheme="Dark"
                accentColor="#F357BB"
              />
            );
          }

          return (
            <div>
              {/* TODO: render tab content */}
              Active tab: {activeId}
            </div>
          );
        }}
      </AiSettingsTabs>
    </AiSettingsLayout>
  );
}
