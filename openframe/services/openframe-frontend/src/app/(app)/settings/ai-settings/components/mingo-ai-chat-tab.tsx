'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

const mingoAiChatSchema = z.object({});

type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

interface MingoAiChatTabProps {
  settings: FaeSettings;
  isEditMode: boolean;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function MingoAiChatTab({ settings: _settings, isEditMode, onSubmit }: MingoAiChatTabProps) {
  const form = useForm<MingoAiChatFormValues>({
    resolver: zodResolver(mingoAiChatSchema),
    defaultValues: {},
  });

  const handleSubmit = form.handleSubmit(() => {
    // TODO: map form values to UpdateFaeSettingsInput once Mingo fields exist.
    // No fields are implemented yet, so guard against sending an empty payload
    // through the shared Save flow (which would trigger a no-op backend update).
    const payload: UpdateFaeSettingsInput = {};
    if (Object.keys(payload).length === 0) {
      return;
    }
    onSubmit(payload);
  });

  if (!isEditMode) {
    return (
      <div className="flex flex-col gap-[var(--spacing-system-l)]">{/* TODO: Mingo AI chat read-only content */}</div>
    );
  }

  return (
    <form id={MINGO_AI_CHAT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-system-l)]">
      {/* TODO: Mingo AI chat fields */}
    </form>
  );
}
