import faeAvatar from '../assets/fae-avatar.png';
import { getFaeAvatarUrl } from '../utils/image-url';
import { useChatConfig } from './useChatConfig';

export interface AssistantBranding {
  /** Configured assistant name; `undefined` when not customized so callers
   *  apply their own fallback (both header and message bubbles default to
   *  "Fae" via `assistantName ?? 'Fae'`). */
  assistantName: string | undefined;
  /** Avatar image src - the configured avatar endpoint, the bundled default,
   *  or `undefined` while settings are still loading (so the avatar never
   *  flashes bundled→custom before the configured one resolves). */
  assistantAvatar: string | undefined;
}

/** Assistant identity from FaeSettings with bundled fallbacks. */
export function useAssistantBranding(): AssistantBranding {
  const { faeSettings, isSettingsLoading } = useChatConfig();
  const configuredName = faeSettings?.assistantName?.trim();
  const avatar = faeSettings?.assistantAvatar;

  // Configured avatar lives behind a public redirect endpoint keyed by the
  // FaeSettings id; only build it when an avatar is actually configured.
  const customAvatarUrl = avatar ? getFaeAvatarUrl(faeSettings?.id, avatar.hash) : undefined;

  return {
    assistantName: configuredName || undefined,
    // While settings are still loading, hold off on the bundled fallback so the
    // avatar doesn't flash bundled→custom; reveal the bundled one only once we
    // know no custom avatar is configured.
    assistantAvatar: customAvatarUrl ?? (isSettingsLoading ? undefined : faeAvatar),
  };
}
