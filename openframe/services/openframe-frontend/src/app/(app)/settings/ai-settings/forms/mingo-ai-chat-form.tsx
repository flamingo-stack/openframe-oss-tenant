'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

const mingoAiChatSchema = z.object({});

export type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

interface MingoAiChatFormProps {
  settings: FaeSettings;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function MingoAiChatForm({ settings: _settings, onSubmit }: MingoAiChatFormProps) {
  const form = useForm<MingoAiChatFormValues>({
    resolver: zodResolver(mingoAiChatSchema),
    defaultValues: {},
  });

  const handleSubmit = form.handleSubmit(() => {
    // TODO: map form values to UpdateFaeSettingsInput
    onSubmit({});
  });

  return (
    <form id={MINGO_AI_CHAT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-system-l)]">
      {/* TODO: Mingo AI chat fields */}
    </form>
  );
}
