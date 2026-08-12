import { useEffect, useMemo } from 'react';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { readBrandingCache, updateBrandingCache } from '../services/brandingCache';
import { useAiSettingsQuery, useApiConnectionState } from './useAiSettingsQuery';
import { useHubQuickActionsQuery } from './useHubQuickActionsQuery';

export interface QuickAction {
  id: string;
  /** Chip/button label shown to the user. */
  name: string;
  /** Prompt text sent into the dialog when the action is clicked. */
  instructions: string;
  /** Optional glyph, present only on Product Hub defaults. Tenant customs have
   *  none. Rendered on the chat chip. */
  iconName?: string | null;
  iconUrl?: string | null;
  iconProps?: Record<string, unknown> | null;
}

export interface DefaultChatModel {
  modelName: string;
  provider: string;
  contextWindow: number;
}

export function useChatConfig() {
  const { flags, isError: flagsUnavailable } = useFeatureFlags();
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

  // Resolved server-provided actions, or `null` when the set hasn't arrived yet
  // (still loading, or the hub/customs request errored). There are NO bundled
  // fallbacks: showing generic defaults masks a customer's real configured set
  // as if it were theirs. `null` keeps the block in its skeleton state until the
  // real actions resolve; an explicit empty array (admin saved "no actions") is
  // a resolved answer and hides the row.
  const resolvedActions = useMemo<QuickAction[] | null>(() => {
    // Feature off → the block is not shown at all (resolved-empty, not skeleton).
    if (!customizationEnabled) return [];

    // Hub defaults: `undefined` while pending/errored → keep the skeleton.
    if (useHubDefaults) return hubQuery.data ?? null;

    // Tenant customs: `undefined`/missing → not resolved yet (skeleton); an
    // explicit `[]` is a resolved "hide" answer.
    const serverActions = query.data?.quickActions;
    if (!serverActions) return null;
    return serverActions.map(action => ({
      id: action.id,
      name: action.name,
      instructions: action.instructions,
    }));
  }, [customizationEnabled, useHubDefaults, hubQuery.data, query.data]);

  // Cold-start bridge: serve the last-resolved set for this connection while
  // the live one is still in flight, so a repeat launch paints real actions
  // instead of a skeleton. `null` when there is no cache entry (first launch).
  const { apiBaseUrl } = useApiConnectionState();
  const cachedActions = useMemo<QuickAction[] | null>(
    () => (customizationEnabled ? (readBrandingCache(apiBaseUrl)?.quickActions ?? null) : null),
    [customizationEnabled, apiBaseUrl],
  );

  const settingsUnavailable = flagsUnavailable || (customizationEnabled && query.isError);

  // Persist only authoritative resolutions - never the flags-fallback or
  // error paths, which would poison the next start's first paint. A disabled
  // flag merely HIDES customization, it doesn't say the tenant has none - so
  // it must not overwrite a previously resolved entry either.
  useEffect(() => {
    if (!apiBaseUrl || !customizationEnabled || settingsUnavailable || resolvedActions === null) return;
    updateBrandingCache(apiBaseUrl, { quickActions: resolvedActions });
  }, [apiBaseUrl, customizationEnabled, settingsUnavailable, resolvedActions]);

  const quickActions = resolvedActions ?? cachedActions ?? [];

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
    // Exposed so branding consumers can skip cache writes while the feature
    // is hidden (a disabled flag is not a "no customization" answer).
    customizationEnabled,
    // Customization consumers (appearance, branding, welcome screen) only see
    // settings when the flag is on - same behavior as when the query itself
    // was flag-disabled.
    aiSettings: customizationEnabled ? (query.data ?? null) : null,
    defaultModel,
    // Branding/appearance skeleton: true while the AiSettings query itself has
    // not produced data (including the wait for the token/API URL). Previously
    // this was derived from the quick-actions resolution, whose hub request is
    // an independent round-trip — it could resolve first and release branding
    // consumers into their defaults while `clientView` was still in flight.
    isSettingsLoading: customizationEnabled && query.isPending,
    // Skeleton state for the quick-action block: true whenever the flag is on
    // but neither the server set nor the per-connection cache has an answer.
    // With no bundled fallback, the block stays a skeleton until real actions
    // arrive rather than flashing generic defaults.
    isQuickActionsLoading: customizationEnabled && resolvedActions === null && cachedActions === null,
    // True when we cannot know the real customization state: the feature-flags
    // fetch failed or timed out (flag values are guesses), or the settings
    // query itself errored. Consumers must NOT treat this as an authoritative
    // "not customized" answer — in particular the appearance hook keeps the
    // persisted pre-paint theme/accent instead of wiping it.
    settingsUnavailable,
  };
}
