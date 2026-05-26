'use client';

import { useCallback, useState } from 'react';
import { useAiSettingsActions } from './ai-settings-actions';
import { AiSettingsCustomerCard } from './ai-settings-customer-card';
import { AiSettingsLayout } from './ai-settings-layout';
import { AiSettingsQuickActions, type QuickAction } from './ai-settings-quick-actions';
import { type AiSettingsTabId, AiSettingsTabs } from './ai-settings-tabs';

const CUSTOMER_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'configure-email',
    title: 'Configure Email on New Device',
    description:
      'Guide user through email setup for Outlook/mobile. Collect: device type, email client, existing account details. Provide step-by-step configuration with server settings: IMAP/SMTP hosts, ports (993/587), SSL requirements. If authentication fails, create ticket with: username, device info, error messages, attempted steps.',
  },
  {
    id: 'connect-shared-drive',
    title: 'Connect to Shared Drive',
    description:
      "Help user map network drives. Get: operating system, drive letter needed, specific share name. Provide commands: Windows - 'net use Z: \\\\server\\share', Mac - 'Connect to Server' steps. Include authentication format: domain\\username. If connection fails, gather: error codes, network location, current permissions, and create ticket for IT review.",
  },
  {
    id: 'request-software-installation',
    title: 'Request Software Installation',
    description:
      "Process software installation requests. Collect: exact software name/version, business justification, urgency level, user's role/department. Check against approved software list. For approved items: create ticket with installation priority. For unapproved: explain approval process, security review timeline, and alternative approved solutions.",
  },
];

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
              <div className="flex flex-col gap-[var(--spacing-system-l)]">
                <AiSettingsCustomerCard
                  assistantName="Grace “Fae” Meadows"
                  llmProvider="Anthropic"
                  providerModel="Claude Opus 4.1"
                  answerStyle="Short"
                  applicationTheme="Dark"
                  accentColor="#F357BB"
                />
                <AiSettingsQuickActions actions={CUSTOMER_QUICK_ACTIONS} />
              </div>
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
