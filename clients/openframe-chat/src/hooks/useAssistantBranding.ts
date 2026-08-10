import { useEffect, useMemo } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { readBrandingCache, updateBrandingCache } from '../services/brandingCache';
import { getFullImageUrl } from '../utils/image-url';
import { useApiConnectionState } from './useAiSettingsQuery';
import { useAuthenticatedImage } from './useAuthenticatedImage';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Assistant name. The configured name when set; otherwise the default "Fae"
   *  once settings have loaded. While settings are still resolving, the
   *  last-resolved cached name for this connection; `undefined` only when there
   *  is no cache either, so callers can show a skeleton instead of flashing. */
  assistantName: string | undefined;
  /** Avatar image src. While still resolving (settings loading or the avatar
   *  fetch in flight) this is the cached data-URI avatar for this connection,
   *  or `undefined` when there is no cache (skeleton). Once resolved it is
   *  either the configured avatar or, when none came from the backend (not
   *  configured / fetch failed), the bundled default avatar. */
  assistantAvatar: string | undefined;
  /** True while the rendered identity is still unknown (nothing to paint yet,
   *  not even a cached value) - drives the header skeleton. */
  isLoading: boolean;
}

/** Assistant identity from AiSettings. */
export function useAssistantBranding(): AssistantBranding {
  const { aiSettings, isSettingsLoading, settingsUnavailable, customizationEnabled } = useChatConfig();
  const configuredName = aiSettings?.assistantName?.trim();
  const avatar = aiSettings?.assistantAvatar;

  const rawAvatarUrl = avatar ? getFullImageUrl(avatar.imageUrl, avatar.hash) : undefined;
  const { url: customAvatarUrl, isLoading: isAvatarLoading } = useAuthenticatedImage(rawAvatarUrl);

  // Cold-start bridge: the last-resolved identity for this connection. A cache
  // entry with null fields is an authoritative "not customized" answer from the
  // previous session, so those paint the defaults immediately; no entry at all
  // means skeletons until the live settings resolve.
  const { apiBaseUrl } = useApiConnectionState();
  const cached = useMemo(() => readBrandingCache(apiBaseUrl), [apiBaseUrl]);
  const cachedName = cached && 'assistantName' in cached ? (cached.assistantName ?? 'Fae') : undefined;
  const cachedAvatar = cached && 'assistantAvatar' in cached ? (cached.assistantAvatar ?? faeAvatar) : undefined;

  // Still resolving while settings load or the avatar fetch is in flight.
  const isResolving = isSettingsLoading || isAvatarLoading;
  // With a configured avatar: show it once resolved, the cached value (or a
  // skeleton) while resolving, default on failure. With none, don't read
  // `customAvatarUrl` — it lags one render behind `rawAvatarUrl`, so it would
  // briefly flash the just-removed avatar; serve the cache (while settings
  // load or their real state is unknowable) or the bundled default.
  const assistantAvatar = rawAvatarUrl
    ? (customAvatarUrl ?? (isResolving ? cachedAvatar : faeAvatar))
    : isSettingsLoading || settingsUnavailable
      ? (cachedAvatar ?? (isSettingsLoading ? undefined : faeAvatar))
      : faeAvatar;

  // Default to "Fae" once settings have loaded with no configured name; while
  // loading (or unknowable) serve the cached name, keeping undefined only when
  // there is nothing at all to paint.
  const assistantName =
    configuredName ||
    (isSettingsLoading || settingsUnavailable ? (cachedName ?? (isSettingsLoading ? undefined : 'Fae')) : 'Fae');

  // Persist the resolved identity for the next cold start. Only authoritative
  // resolutions are written - never the flags-fallback or query-error paths,
  // and never while the feature is flag-hidden (a disabled flag is not a
  // "no customization" answer, so it must not overwrite a resolved entry).
  useEffect(() => {
    if (!apiBaseUrl || !customizationEnabled || isSettingsLoading || settingsUnavailable || isAvatarLoading) return;
    // A configured avatar whose fetch failed is a transient error, not a
    // "not customized" answer - don't overwrite the cached image with null.
    if (rawAvatarUrl && !customAvatarUrl) return;
    updateBrandingCache(apiBaseUrl, {
      assistantName: configuredName || null,
      assistantAvatar: (rawAvatarUrl ? customAvatarUrl : null) ?? null,
    });
  }, [
    apiBaseUrl,
    customizationEnabled,
    isSettingsLoading,
    settingsUnavailable,
    isAvatarLoading,
    configuredName,
    rawAvatarUrl,
    customAvatarUrl,
  ]);

  return {
    assistantName,
    assistantAvatar,
    isLoading: assistantName === undefined || assistantAvatar === undefined,
  };
}
