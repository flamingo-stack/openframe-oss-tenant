'use client';

import {
  ChatsIcon,
  MingoMonochromeIcon,
  ShieldCheckIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import { featureFlags } from '@/lib/feature-flags';

export const AI_SETTINGS_TAB_IDS = ['customer', 'mingo', 'guardrails'] as const;
export type AiSettingsTabId = (typeof AI_SETTINGS_TAB_IDS)[number];

export const AI_SETTINGS_TABS: TabItem[] = [
  { id: 'customer', label: 'Customer AI Assistant', icon: ChatsIcon },
  { id: 'mingo', label: 'Mingo AI Chat', icon: MingoMonochromeIcon },
  { id: 'guardrails', label: 'Guardrails', icon: ShieldCheckIcon },
];

// Tabs gated behind server feature flags until each feature ships. Guardrails
// is always visible.
const TAB_FEATURE_FLAG: Partial<Record<AiSettingsTabId, () => boolean>> = {
  // Temporarily always visible: the Customer AI Assistant tab is shown, while the
  // not-yet-released appearance customization it controls stays gated behind
  // `featureFlags.customerAiAssistantSettings` at its own call sites.
  customer: () => true,
  mingo: () => featureFlags.mingoAiChatSettings.enabled(),
};

/** Tabs visible for the current feature-flag state (server-driven). */
export function getVisibleAiSettingsTabs(): TabItem[] {
  return AI_SETTINGS_TABS.filter(tab => {
    const flag = TAB_FEATURE_FLAG[tab.id as AiSettingsTabId];
    return !flag || flag();
  });
}

interface AiSettingsTabsProps {
  activeTab: AiSettingsTabId;
  onTabChange: (id: AiSettingsTabId) => void;
  children: (activeTab: AiSettingsTabId) => ReactNode;
}

export function AiSettingsTabs({ activeTab, onTabChange, children }: AiSettingsTabsProps) {
  const tabs = getVisibleAiSettingsTabs();

  return (
    <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={tabId => onTabChange(tabId as AiSettingsTabId)}>
      {activeId => <div className="pt-[var(--spacing-system-l)]">{children(activeId as AiSettingsTabId)}</div>}
    </TabNavigation>
  );
}
