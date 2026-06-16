'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';
import {
  getMingoAiChatDefaults,
  MINGO_AI_CHAT_FORM_ID,
  type MingoAiChatFormValues,
  mingoAiChatSchema,
} from '../types/mingo-ai-chat.types';
import { AiSettingsOverview } from './ai-settings-overview';
import { AiSettingsQuickActionsEditor } from './ai-settings-quick-actions-editor';

interface MingoAiChatTabProps {
  settings: FaeSettings;
  isEditMode: boolean;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function MingoAiChatTab({ settings, isEditMode, onSubmit }: MingoAiChatTabProps) {
  const form = useForm<MingoAiChatFormValues>({
    resolver: zodResolver(mingoAiChatSchema),
    defaultValues: getMingoAiChatDefaults(settings),
  });

  // DEMO: Mingo quick actions will get their own BE query/mutation; until then
  // they read and save the shared Fae quickActions field.
  const handleSubmit = form.handleSubmit(values => {
    onSubmit({ quickActions: values.quickActions });
  });

  if (!isEditMode) {
    return <AiSettingsOverview quickActions={settings.quickActions} />;
  }

  return (
    <form id={MINGO_AI_CHAT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-system-l)]">
      <AiSettingsQuickActionsEditor control={form.control} title="Mingo Quick Actions" />
    </form>
  );
}
