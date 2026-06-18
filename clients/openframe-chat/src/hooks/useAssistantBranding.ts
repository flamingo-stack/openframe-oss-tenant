import faeAvatar from '../assets/fae-avatar.png';
import { getFullImageUrl } from '../utils/image-url';
import { useAuthenticatedImage } from './useAuthenticatedImage';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Configured assistant name; `undefined` when not customized so callers
   *  apply their own fallback (both header and message bubbles default to
   *  "Fae" via `assistantName ?? 'Fae'`). */
  assistantName: string | undefined;
  /** Avatar image src - the configured avatar endpoint, or `undefined` when no
   *  avatar is configured / on error. We never fall back to a bundled default:
   *  the header shows a skeleton while `isLoading`, then either the configured
   *  avatar or the name initials. */
  assistantAvatar: string | undefined;
  /** True while FaeSettings is still loading - drives the header skeleton so
   *  we don't flash initials/avatar before the real value resolves. */
  isLoading: boolean;
}

/** Assistant identity from FaeSettings. */
export function useAssistantBranding(): AssistantBranding {
  const { faeSettings, isSettingsLoading } = useChatConfig();
  const configuredName = faeSettings?.assistantName?.trim();
  const avatar = faeSettings?.assistantAvatar;

  const rawAvatarUrl = avatar ? getFullImageUrl(avatar.imageUrl, avatar.hash) : faeAvatar;
  const customAvatarUrl = useAuthenticatedImage(rawAvatarUrl);

  return {
    assistantName: configuredName || undefined,
    assistantAvatar: customAvatarUrl,
    isLoading: isSettingsLoading,
  };
}
