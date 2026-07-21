import { useMemo } from 'react';
import quickActionsData from '../config/quickActions.json';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAiSettingsQuery } from './useAiSettingsQuery';
import { useHubQuickActionsQuery } from './useHubQuickActionsQuery';

export interface QuickAction {
  id: string;
  /** Chip/button label shown to the user. */
  name: string;
  /** Prompt text sent into the dialog when the action is clicked. */
  instructions: string;
  /** Optional glyph, present only on Product Hub defaults. Tenant customs and
   *  bundled fallbacks have none. Rendered on the chat chip. */
  iconName?: string | null;
  iconUrl?: string | null;
  iconProps?: Record<string, unknown> | null;
}

// Bundled defaults - used while the customer-ai-assistant-settings flag is off,
// or as the last resort when the hub defaults cannot be loaded.
const FALLBACK_QUICK_ACTIONS: QuickAction[] = quickActionsData.actions.map(action => ({
  id: action.id,
  name: action.text,
  instructions: action.text,
}));

export interface DefaultChatModel {
  modelName: string;
  provider: string;
  contextWindow: number;
}

export function useChatConfig() {
  const { flags } = useFeatureFlags();
  const customizationEnabled = flags['customer-ai-assistant-settings'];
  // Always fetch: the effective provider/model (org override -> tenant
  // default, resolved server-side from the machine token) seeds the footer
  // model display regardless of the customization flag. Appearance and quick
  // actions stay flag-gated below, preserving the flag's semantics.
  const query = useAiSettingsQuery({ enabled: true });

  // Source switch: `clientAiConfig.quickActionsIsDefault` (true until the org
  // customizes, and while the settings are still loading) selects the OpenFrame
  // defaults published in the Product Hub — the CLIENT (Fae) set, distinct from
  // the admin (Mingo) one. The tenant BE only stores the org's customs.
  const useHubDefaults = query.data?.quickActionsIsDefault ?? true;
  const hubQuery = useHubQuickActionsQuery({ enabled: customizationEnabled && useHubDefaults });

  const quickActions = useMemo<QuickAction[]>(() => {
    if (!customizationEnabled) {
      return FALLBACK_QUICK_ACTIONS;
    }

    if (useHubDefaults) {
      // Hub unreachable/errored → bundled defaults rather than an empty row.
      return hubQuery.data ?? FALLBACK_QUICK_ACTIONS;
    }

    // Customs. Nullable vs empty matters here: `null`/missing means "nothing
    // configured yet" and falls back to the bundled defaults, while an
    // explicitly saved empty list means the admin chose to hide quick actions
    // entirely - so we return it as-is and the UI renders no action row.
    const serverActions = query.data?.quickActions;
    if (serverActions) {
      return serverActions.map(action => ({
        id: action.id,
        name: action.name,
        instructions: action.instructions,
      }));
    }
    return FALLBACK_QUICK_ACTIONS;
  }, [customizationEnabled, useHubDefaults, hubQuery.data, query.data]);

  // Effective model for the NEXT reply (org override -> tenant default).
  // Null when the tenant never configured CLIENT AI at all - the footer then
  // stays empty until the first reply's stream metadata arrives.
  const defaultModel = useMemo<DefaultChatModel | null>(() => {
    const settings = query.data;
    return settings?.providerModel
      ? { modelName: settings.providerModel, provider: settings.llmProvider ?? '', contextWindow: 0 }
      : null;
  }, [query.data]);

  return {
    quickActions,
    // Customization consumers (appearance, branding, welcome screen) only see
    // settings when the flag is on - same behavior as when the query itself
    // was flag-disabled.
    aiSettings: customizationEnabled ? (query.data ?? null) : null,
    defaultModel,
    // True while we still expect a server-resolved action set (flag on and
    // either query hasn't settled - including the brief wait for the token).
    // Lets callers hold off on bundled fallbacks until the server answers.
    isSettingsLoading: customizationEnabled && (query.isPending || (useHubDefaults && hubQuery.isPending)),
  };
}
