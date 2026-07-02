'use client';

import { FAE_AVATAR_DATA_URI } from '@flamingo-stack/openframe-frontend-core/assets';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ApplicationTheme } from '../../types/ai-settings';
import { FaeChatPreview } from './fae-chat-preview';
import { MeetFaePreview } from './meet-fae-preview';
import { useResolvedTheme } from './use-resolved-theme';

interface AiSettingsPreviewsProps {
  assistantName: string;
  avatarUrl?: string;
  accentColor: string;
  theme: ApplicationTheme;
  providerName?: string;
  modelDisplayName?: string;
}

/** Side-by-side onboarding + chat previews, re-themed locally via `.theme-light` / `.theme-dark`. */
export function AiSettingsPreviews({
  assistantName,
  avatarUrl,
  accentColor,
  theme,
  providerName,
  modelDisplayName,
}: AiSettingsPreviewsProps) {
  const resolved = useResolvedTheme(theme);

  // Fall back to the library's packaged default Fae avatar when no custom image
  // is uploaded — same behavior as the chat, which never renders an empty/broken
  // avatar. Keeps both previews (and their MSP/chat cards) looking complete.
  const resolvedAvatarUrl = avatarUrl || FAE_AVATAR_DATA_URI;

  // Scope the theme to each card, not the wrapper: `.theme-light` flips
  // `--ods-system-greys-background`, so applying it to the container would turn
  // the whole container white too. Per-card scoping keeps the container on the
  // (dark) app background while only the cards re-theme.
  const themeClass = cn('ai-preview-theme', resolved === 'light' ? 'theme-light' : 'theme-dark');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-[var(--spacing-system-l)] rounded-md bg-ods-bg">
      <div className={themeClass}>
        <MeetFaePreview assistantName={assistantName} avatarUrl={resolvedAvatarUrl} accentColor={accentColor} />
      </div>
      <div className={themeClass}>
        <FaeChatPreview
          assistantName={assistantName}
          avatarUrl={resolvedAvatarUrl}
          accentColor={accentColor}
          providerName={providerName}
          modelDisplayName={modelDisplayName}
        />
      </div>
    </div>
  );
}
