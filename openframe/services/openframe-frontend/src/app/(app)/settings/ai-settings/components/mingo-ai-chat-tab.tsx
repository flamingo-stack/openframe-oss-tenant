'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';
import {
  getMingoAiChatDefaults,
  MINGO_AI_CHAT_FORM_ID,
  type MingoAiChatFormValues,
  mingoAiChatSchema,
} from '../types/mingo-ai-chat.types';
import { AiModelConfig, type AiModelConfigHandle } from './ai-model-config';
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

  // Ai model config saves itself (separate BE endpoint) via this ref on submit.
  const aiModelRef = useRef<AiModelConfigHandle>(null);

  // DEMO: Mingo quick actions will get their own BE query/mutation; until then
  // they read and save the shared Fae quickActions field.
  const handleSubmit = form.handleSubmit(async values => {
    const ok = await aiModelRef.current?.save();
    if (ok === false) return;
    onSubmit({ quickActions: values.quickActions });
  });

  if (!isEditMode) {
    return (
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        <AiModelConfig ref={aiModelRef} isEditMode={false} />
        <AiSettingsOverview quickActions={settings.quickActions} />
      </div>
    );
  }

  return (
    <form id={MINGO_AI_CHAT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-system-l)]">
      <AiModelConfig ref={aiModelRef} isEditMode />
      <AiSettingsQuickActionsEditor control={form.control} title="Mingo Quick Actions" />
    </form>
  );
}
