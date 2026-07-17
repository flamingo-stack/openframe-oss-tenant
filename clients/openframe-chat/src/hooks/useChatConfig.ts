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
}

// Bundled defaults - used while the customer-ai-assistant-settings flag is off,
// or as the last resort when the hub defaults cannot be loaded.
const FALLBACK_QUICK_ACTIONS: QuickAction[] = quickActionsData.actions.map(action => ({
  id: action.id,
  name: action.text,
  instructions: action.text,
}));

export function useChatConfig() {
  const { flags } = useFeatureFlags();
  const customizationEnabled = flags['customer-ai-assistant-settings'];
  const query = useAiSettingsQuery({ enabled: customizationEnabled });

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

  return {
    quickActions,
    aiSettings: query.data ?? null,
    // True while we still expect a server-resolved action set (flag on and
    // either query hasn't settled - including the brief wait for the token).
    // Lets callers hold off on bundled fallbacks until the server answers.
    isSettingsLoading: customizationEnabled && (query.isPending || (useHubDefaults && hubQuery.isPending)),
  };
}
