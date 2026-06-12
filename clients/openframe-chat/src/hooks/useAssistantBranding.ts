import faeAvatar from '../assets/fae-avatar.png';
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

  return {
    assistantName: configuredName || undefined,
    assistantAvatar: faeSettings?.assistantAvatar?.imageUrl || faeAvatar,
  };
}
