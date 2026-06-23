import { useMemo } from 'react';
import quickActionsData from '../config/quickActions.json';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAiSettingsQuery } from './useAiSettingsQuery';

export interface QuickAction {
  id: string;
  /** Chip/button label shown to the user. */
  name: string;
  /** Prompt text sent into the dialog when the action is clicked. */
  instructions: string;
}

// Bundled defaults - used while the customer-ai-assistant-settings flag is off,
// the server has no AiSettings record (or its quickActions is null), or the
// query errors out. An explicitly saved empty list does NOT fall back here.
const FALLBACK_QUICK_ACTIONS: QuickAction[] = quickActionsData.actions.map(action => ({
  id: action.id,
  name: action.text,
  instructions: action.text,
}));

export function useChatConfig() {
  const { flags } = useFeatureFlags();
  const customizationEnabled = flags['customer-ai-assistant-settings'];
  const query = useAiSettingsQuery({ enabled: customizationEnabled });

  const quickActions = useMemo<QuickAction[]>(() => {
    // Nullable vs empty matters here: `null`/missing means "nothing configured
    // yet" and falls back to the bundled defaults, while an explicitly saved
    // empty list means the admin chose to hide quick actions entirely - so we
    // return it as-is and the UI renders no action row.
    const serverActions = query.data?.quickActions;
    if (customizationEnabled && serverActions) {
      return serverActions.map(action => ({
        id: action.id,
        name: action.name,
        instructions: action.instructions,
      }));
    }
    return FALLBACK_QUICK_ACTIONS;
  }, [customizationEnabled, query.data]);

  return {
    quickActions,
    aiSettings: query.data ?? null,
    // True while we still expect an AiSettings result from the server (flag on
    // and the query hasn't settled - including the brief wait for the token).
    // Lets callers hold off on bundled fallbacks until the server answers.
    isSettingsLoading: customizationEnabled && query.isPending,
  };
}
