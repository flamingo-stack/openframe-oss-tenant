'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSupportedModels } from '../hooks/use-supported-models';
import type { AgentAiConfig, AgentAiConfigInput } from '../types/ai-settings';
import {
  getMingoAiChatDefaults,
  MINGO_AI_CHAT_FORM_ID,
  type MingoAiChatFormValues,
  mingoAiChatSchema,
  toMingoAiChatSubmit,
} from '../types/mingo-ai-chat.types';
import { AiConfigFields } from './ai-config-fields';
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

  const { modelsByProvider } = useSupportedModels();
  const llmProvider = form.watch('llmProvider');
  const answerStyle = form.watch('answerStyle');

  const handleSubmit = form.handleSubmit(values => onSubmit(toMingoAiChatSubmit(values)));

  if (!isEditMode) {
    return <AiSettingsOverview aiConfig={aiConfig} quickActions={aiConfig.quickActions} />;
  }

  return (
    <form
      id={MINGO_AI_CHAT_FORM_ID}
      onSubmit={handleSubmit}
      className="flex flex-col gap-[var(--spacing-system-l)] max-md:[&_input]:!text-[14px] max-md:[&_textarea]:!text-[14px]"
    >
      <AiConfigFields
        control={form.control}
        llmProvider={llmProvider}
        answerStyle={answerStyle}
        modelsByProvider={modelsByProvider}
        onProviderChange={() => form.setValue('providerModel', '')}
      />

      <AiSettingsQuickActionsEditor control={form.control} title="Mingo Quick Actions" className="mt-8" />
    </form>
  );
}
