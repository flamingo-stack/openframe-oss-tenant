'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { AgentAiConfig, AgentAiConfigInput } from '../types/ai-settings';
import {
  getMingoAiChatDefaults,
  MINGO_AI_CHAT_FORM_ID,
  type MingoAiChatFormValues,
  mingoAiChatSchema,
  toMingoAiChatSubmit,
} from '../types/mingo-ai-chat.types';
import { AiModelConfig, type AiModelConfigHandle } from './ai-model-config';
import { AiSettingsOverview } from './ai-settings-overview';
import { AiSettingsQuickActionsEditor } from './ai-settings-quick-actions-editor';

interface MingoAiChatTabProps {
  aiConfig: AgentAiConfig;
  isEditMode: boolean;
  onSubmit: (input: AgentAiConfigInput) => void;
}

export function MingoAiChatTab({ aiConfig, isEditMode, onSubmit }: MingoAiChatTabProps) {
  const form = useForm<MingoAiChatFormValues>({
    resolver: zodResolver(mingoAiChatSchema),
    defaultValues: getMingoAiChatDefaults(aiConfig),
  });

  // AiModelConfig owns the provider/model and persists it to the REST AI
  // configuration endpoint; saved via this ref on submit. The admin quick
  // actions are persisted separately through adminAiConfig (onSubmit).
  const aiModelRef = useRef<AiModelConfigHandle>(null);

  const handleSubmit = form.handleSubmit(async values => {
    const ok = await aiModelRef.current?.save();
    if (ok === false) return;
    onSubmit(toMingoAiChatSubmit(values));
  });

  if (!isEditMode) {
    return (
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        <AiModelConfig ref={aiModelRef} isEditMode={false} />
        <AiSettingsOverview quickActions={aiConfig.quickActions} />
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
