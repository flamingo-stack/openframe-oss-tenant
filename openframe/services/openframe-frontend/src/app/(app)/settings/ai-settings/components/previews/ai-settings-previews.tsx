'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ApplicationTheme } from '../../types/fae-settings';
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

  return (
    <div
      className={cn(
        'ai-preview-theme',
        resolved === 'light' ? 'theme-light' : 'theme-dark',
        'grid grid-cols-2 items-start gap-[var(--spacing-system-l)] rounded-md bg-ods-bg',
      )}
    >
      <MeetFaePreview assistantName={assistantName} avatarUrl={avatarUrl} accentColor={accentColor} />
      <FaeChatPreview
        assistantName={assistantName}
        avatarUrl={avatarUrl}
        accentColor={accentColor}
        providerName={providerName}
        modelDisplayName={modelDisplayName}
      />
    </div>
  );
}
