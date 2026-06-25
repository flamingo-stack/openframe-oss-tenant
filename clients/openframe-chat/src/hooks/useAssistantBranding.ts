import faeAvatar from '../assets/fae-avatar.png';
import { getFullImageUrl } from '../utils/image-url';
import { useAuthenticatedImage } from './useAuthenticatedImage';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Assistant name. The configured name when set; otherwise the default "Fae"
   *  once settings have loaded. `undefined` only while settings are still
   *  loading, so callers can show a skeleton instead of flashing a name. */
  assistantName: string | undefined;
  /** Avatar image src. While still resolving (settings loading or the avatar
   *  fetch in flight) this is `undefined` so the header shows a skeleton rather
   *  than flashing a fallback. Once resolved it is either the configured avatar
   *  or, when none came from the backend (not configured / fetch failed), the
   *  bundled default avatar. */
  assistantAvatar: string | undefined;
  /** True while the assistant identity is still resolving (AiSettings loading
   *  or the avatar fetch in flight) - drives the header skeleton so we don't
   *  flash the default avatar before the real value resolves. */
  isLoading: boolean;
}

/** Assistant identity from AiSettings. */
export function useAssistantBranding(): AssistantBranding {
  const { aiSettings, isSettingsLoading } = useChatConfig();
  const configuredName = aiSettings?.assistantName?.trim();
  const avatar = aiSettings?.assistantAvatar;

  const rawAvatarUrl = avatar ? getFullImageUrl(avatar.imageUrl, avatar.hash) : undefined;
  const { url: customAvatarUrl, isLoading: isAvatarLoading } = useAuthenticatedImage(rawAvatarUrl);

  // Still resolving while settings load or the avatar fetch is in flight.
  const isResolving = isSettingsLoading || isAvatarLoading;
  // With a configured avatar: show it once resolved, skeleton while resolving,
  // default on failure. With none, don't read `customAvatarUrl` — it lags one
  // render behind `rawAvatarUrl` (its object URL is cleared in an effect), so it
  // would briefly flash the just-removed avatar; go straight to skeleton (while
  // settings load) or the bundled default.
  const assistantAvatar = rawAvatarUrl
    ? (customAvatarUrl ?? (isResolving ? undefined : faeAvatar))
    : isSettingsLoading
      ? undefined
      : faeAvatar;

  return {
    // Default to "Fae" once settings have loaded with no configured name;
    // stay undefined while loading so callers don't flash a name.
    assistantName: configuredName || (isSettingsLoading ? undefined : 'Fae'),
    assistantAvatar,
    isLoading: isResolving,
  };
}
