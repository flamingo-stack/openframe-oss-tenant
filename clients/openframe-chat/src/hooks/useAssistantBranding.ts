import faeAvatar from '../assets/fae-avatar.png';
import { getFullImageUrl } from '../utils/image-url';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Configured assistant name; `undefined` when not customized so callers
   *  keep their own defaults (header shows the lib default, messages "Fae"). */
  assistantName: string | undefined;
  /** Avatar image src - the configured URL or the bundled default. */
  assistantAvatar: string;
}

/** Assistant identity from FaeSettings with bundled fallbacks. */
export function useAssistantBranding(): AssistantBranding {
  const { faeSettings } = useChatConfig();
  const configuredName = faeSettings?.assistantName?.trim();
  const avatar = faeSettings?.assistantAvatar;

  return {
    assistantName: configuredName || undefined,
    assistantAvatar: getFullImageUrl(avatar?.imageUrl, avatar?.hash) || faeAvatar,
  };
}
