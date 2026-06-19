import faeAvatar from '../assets/fae-avatar.png';
import { getFullImageUrl } from '../utils/image-url';
import { useAuthenticatedImage } from './useAuthenticatedImage';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Configured assistant name; `undefined` when not customized so callers
   *  apply their own fallback (both header and message bubbles default to
   *  "Fae" via `assistantName ?? 'Fae'`). */
  assistantName: string | undefined;
  /** Avatar image src. While still resolving (settings loading or the avatar
   *  fetch in flight) this is `undefined` so the header shows a skeleton rather
   *  than flashing a fallback. Once resolved it is either the configured avatar
   *  or, when none came from the backend (not configured / fetch failed), the
   *  bundled default avatar. */
  assistantAvatar: string | undefined;
  /** True while the assistant identity is still resolving (FaeSettings loading
   *  or the avatar fetch in flight) - drives the header skeleton so we don't
   *  flash the default avatar before the real value resolves. */
  isLoading: boolean;
}

/** Assistant identity from FaeSettings. */
export function useAssistantBranding(): AssistantBranding {
  const { faeSettings, isSettingsLoading } = useChatConfig();
  const configuredName = faeSettings?.assistantName?.trim();
  const avatar = faeSettings?.assistantAvatar;

  const rawAvatarUrl = avatar ? getFullImageUrl(avatar.imageUrl, avatar.hash) : undefined;
  const { url: customAvatarUrl, isLoading: isAvatarLoading } = useAuthenticatedImage(rawAvatarUrl);

  // Still resolving while settings load or the avatar fetch is in flight.
  const isResolving = isSettingsLoading || isAvatarLoading;
  // Show the configured avatar; while resolving keep `undefined` (skeleton);
  // once resolved with no backend avatar, fall back to the bundled default.
  const assistantAvatar = customAvatarUrl ?? (isResolving ? undefined : faeAvatar);

  return {
    assistantName: configuredName || undefined,
    assistantAvatar,
    isLoading: isResolving,
  };
}
