import { useMemo } from 'react';
import quickActionsData from '../config/quickActions.json';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useFaeSettingsQuery } from './useFaeSettingsQuery';

export interface QuickAction {
  id: string;
  /** Chip/button label shown to the user. */
  name: string;
  /** Prompt text sent into the dialog when the action is clicked. */
  instructions: string;
}

// Bundled defaults - used while the customer-ai-assistant-settings flag is off,
// the server has no FaeSettings record, or the query errors out.
const FALLBACK_QUICK_ACTIONS: QuickAction[] = quickActionsData.actions.map(action => ({
  id: action.id,
  name: action.text,
  instructions: action.text,
}));

export function useChatConfig() {
  const { flags } = useFeatureFlags();
  const customizationEnabled = flags['customer-ai-assistant-settings'];
  const query = useFaeSettingsQuery({ enabled: customizationEnabled });

  const quickActions = useMemo<QuickAction[]>(() => {
    const serverActions = query.data?.quickActions;
    if (customizationEnabled && serverActions && serverActions.length > 0) {
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
    faeSettings: query.data ?? null,
  };
}
