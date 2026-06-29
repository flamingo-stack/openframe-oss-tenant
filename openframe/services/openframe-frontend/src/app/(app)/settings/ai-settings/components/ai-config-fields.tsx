'use client';

import {
  RadioGroupBlock,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type Control, Controller, type FieldValues } from 'react-hook-form';
import type { SupportedModelsByProvider } from '../hooks/use-supported-models';
import type { AiLogicFormValues } from '../types/ai-logic.types';
import type { AIProvider, AnswerStyle } from '../types/ai-settings';
import {
  ANSWER_STYLE_OPTIONS,
  LLM_PROVIDER_ICON,
  LLM_PROVIDER_LABEL,
  LLM_PROVIDER_OPTIONS,
} from '../utils/ai-settings-display';

interface AiProviderModelFieldsProps<T extends AiLogicFormValues & FieldValues> {
  control: Control<T>;
  /** Watched provider; drives the model option list. */
  llmProvider: AIProvider;
  modelsByProvider: SupportedModelsByProvider | undefined;
  /** Clears the selected model when the provider changes. */
  onProviderChange: () => void;
  /** Label for the provider select (e.g. "Mingo LLM Provider"). */
  providerLabel?: string;
}

/**
 * LLM Provider + Provider Model selects, rendered side by side. Split out from
 * the answer-style fields so hosts can place it independently (e.g. the customer
 * tab keeps it in the top block, above the previews, per design).
 */
export function AiProviderModelFields<T extends AiLogicFormValues & FieldValues>({
  control,
  llmProvider,
  modelsByProvider,
  onProviderChange,
  providerLabel = 'LLM Provider',
}: AiProviderModelFieldsProps<T>) {
  // The generic constraint guarantees the form has the AI-logic fields; cast
  // narrows Control to that shape for type-safe field names.
  const aiControl = control as unknown as Control<AiLogicFormValues>;
  const modelOptions = modelsByProvider?.[llmProvider] ?? [];

  return (
    <div className="flex flex-row gap-[var(--spacing-system-l)]">
      <div className="flex-1 min-w-0">
        <Controller
          name="llmProvider"
          control={aiControl}
          render={({ field, fieldState }) => (
            <Select
              value={field.value}
              onValueChange={value => {
                field.onChange(value);
                onProviderChange();
              }}
            >
              <SelectTrigger label={providerLabel} error={fieldState.error?.message}>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDER_OPTIONS.map(provider => {
                  const Icon = LLM_PROVIDER_ICON[provider];
                  return (
                    <SelectItem key={provider} value={provider}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {LLM_PROVIDER_LABEL[provider]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <Controller
          name="providerModel"
          control={aiControl}
          render={({ field, fieldState }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger label="Provider Model" error={fieldState.error?.message}>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}

interface AiAnswerStyleFieldsProps<T extends AiLogicFormValues & FieldValues> {
  control: Control<T>;
  /** Watched answer style; CUSTOM reveals the custom prompt field. */
  answerStyle: AnswerStyle;
}

/** Answer Style radio group + the conditional custom-prompt textarea. */
export function AiAnswerStyleFields<T extends AiLogicFormValues & FieldValues>({
  control,
  answerStyle,
}: AiAnswerStyleFieldsProps<T>) {
  const aiControl = control as unknown as Control<AiLogicFormValues>;

  return (
    <>
      <Controller
        name="answerStyle"
        control={aiControl}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1">
            <span className="text-h4 text-ods-text-primary">Answer Style</span>
            <RadioGroupBlock
              variant="grouped"
              value={field.value}
              onValueChange={field.onChange}
              options={ANSWER_STYLE_OPTIONS}
              itemClassName="p-[var(--spacing-system-sf)] gap-[var(--spacing-system-s)] [&>button]:size-4 md:[&>button]:size-6"
              error={fieldState.error?.message}
            />
          </div>
        )}
      />

      {answerStyle === 'CUSTOM' && (
        <Controller
          name="customPrompt"
          control={aiControl}
          render={({ field, fieldState }) => (
            <Textarea {...field} label="AI Model Custom Prompt" error={fieldState.error?.message} rows={6} />
          )}
        />
      )}
    </>
  );
}
