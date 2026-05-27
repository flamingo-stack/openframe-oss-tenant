'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';

export const CUSTOMER_AI_ASSISTANT_FORM_ID = 'ai-settings-customer-ai-assistant-form';

const customerAiAssistantSchema = z.object({});

export type CustomerAiAssistantFormValues = z.infer<typeof customerAiAssistantSchema>;

interface CustomerAiAssistantFormProps {
  settings: FaeSettings;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function CustomerAiAssistantForm({ settings: _settings, onSubmit }: CustomerAiAssistantFormProps) {
  const form = useForm<CustomerAiAssistantFormValues>({
    resolver: zodResolver(customerAiAssistantSchema),
    defaultValues: {},
  });

  const handleSubmit = form.handleSubmit(() => {
    // TODO: map form values to UpdateFaeSettingsInput
    onSubmit({});
  });

  return (
    <form
      id={CUSTOMER_AI_ASSISTANT_FORM_ID}
      onSubmit={handleSubmit}
      className="flex flex-col gap-[var(--spacing-system-l)]"
    >
      {/* TODO: customer AI assistant fields (assistantName, llmProvider, providerModel, applicationTheme, accentColor, answerStyle, customPrompt, assistantAvatar, quickActions) */}
    </form>
  );
}
