'use client';

import { featureFlags } from '@/lib/feature-flags';
import { useAdminAiConfig } from '../../settings/ai-settings/hooks/use-agent-ai-config';
import type { AiQuickAction } from '../../settings/ai-settings/types/ai-settings';

/**
 * Admin-configured Mingo quick actions, for the chat's empty-state chip row.
 *
 * Reads the ADMIN `AgentAiConfig.quickActions` — the same record the AI Settings
 * "Mingo AI Chat" tab edits — so what an admin saves there shows up as starter
 * chips in the chat. Gated by the same `mingo-ai-chat-settings` flag that gates
 * that tab, so the feature toggles together (and the query stays idle when off).
 */
export function useMingoQuickActions(): AiQuickAction[] {
  const enabled = featureFlags.mingoAiChatSettings.enabled();
  const { config } = useAdminAiConfig({ enabled });
  return enabled ? (config?.quickActions ?? []) : [];
}
