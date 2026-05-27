'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';

export const GUARDRAILS_FORM_ID = 'ai-settings-guardrails-form';

const guardrailsSchema = z.object({});

export type GuardrailsFormValues = z.infer<typeof guardrailsSchema>;

interface GuardrailsFormProps {
  settings: FaeSettings;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function GuardrailsForm({ settings: _settings, onSubmit }: GuardrailsFormProps) {
  const form = useForm<GuardrailsFormValues>({
    resolver: zodResolver(guardrailsSchema),
    defaultValues: {},
  });

  const handleSubmit = form.handleSubmit(() => {
    // TODO: map form values to UpdateFaeSettingsInput
    onSubmit({});
  });

  return (
    <form id={GUARDRAILS_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-system-l)]">
      {/* TODO: Guardrails fields (policy template + custom overrides) */}
    </form>
  );
}
