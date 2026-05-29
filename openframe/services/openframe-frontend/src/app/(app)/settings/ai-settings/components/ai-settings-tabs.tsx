'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { ChatsIcon, ShieldCheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';

export const AI_SETTINGS_TAB_IDS = ['customer', 'mingo', 'guardrails'] as const;
export type AiSettingsTabId = (typeof AI_SETTINGS_TAB_IDS)[number];

export const AI_SETTINGS_TABS: TabItem[] = [
  { id: 'customer', label: 'Customer AI Assistant', icon: ChatsIcon },
  { id: 'mingo', label: 'Mingo AI Chat', icon: MingoIcon },
  { id: 'guardrails', label: 'Guardrails', icon: ShieldCheckIcon },
];

interface AiSettingsTabsProps {
  activeTab: AiSettingsTabId;
  onTabChange: (id: AiSettingsTabId) => void;
  children: (activeTab: AiSettingsTabId) => ReactNode;
}

export function AiSettingsTabs({ activeTab, onTabChange, children }: AiSettingsTabsProps) {
  return (
    <TabNavigation
      tabs={AI_SETTINGS_TABS}
      activeTab={activeTab}
      onTabChange={tabId => onTabChange(tabId as AiSettingsTabId)}
      showRightGradient
    >
      {activeId => <div className="pt-[var(--spacing-system-l)]">{children(activeId as AiSettingsTabId)}</div>}
    </TabNavigation>
  );
}
