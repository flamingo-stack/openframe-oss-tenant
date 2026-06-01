'use client';

import { PlusCircleIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  ImageUploader,
  Input,
  RadioGroupBlock,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type Control, Controller } from 'react-hook-form';
import { useCustomerAiAssistantForm } from '../hooks/use-customer-ai-assistant-form';
import {
  CUSTOMER_AI_ASSISTANT_FORM_ID,
  type CustomerAiAssistantFormValues,
} from '../types/customer-ai-assistant.types';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';
import {
  ANSWER_STYLE_OPTIONS,
  LLM_PROVIDER_ICON,
  LLM_PROVIDER_LABEL,
  LLM_PROVIDER_OPTIONS,
  PROVIDER_MODELS,
} from '../utils/fae-settings-display';

export type { CustomerAiAssistantFormValues } from '../types/customer-ai-assistant.types';
export { CUSTOMER_AI_ASSISTANT_FORM_ID } from '../types/customer-ai-assistant.types';

interface CustomerAiAssistantFormProps {
  settings: FaeSettings;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function CustomerAiAssistantForm({ settings, onSubmit }: CustomerAiAssistantFormProps) {
  const {
    form,
    avatarUrl,
    handleAvatarChange,
    handleAvatarRemove,
    quickActionFields,
    addQuickAction,
    removeQuickAction,
    handleSubmit,
  } = useCustomerAiAssistantForm({ settings, onSubmit });

  const llmProvider = form.watch('llmProvider');
  const modelOptions = PROVIDER_MODELS[llmProvider] ?? [];
  const answerStyle = form.watch('answerStyle');

  return (
    <form
      id={CUSTOMER_AI_ASSISTANT_FORM_ID}
      onSubmit={handleSubmit}
      className="flex flex-col gap-[var(--spacing-system-l)] max-md:[&_input]:!text-[14px] max-md:[&_textarea]:!text-[14px]"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-[var(--spacing-system-l)]">
        <div className="flex flex-col gap-[var(--spacing-system-l)] flex-1 min-w-0">
          <Controller
            name="assistantName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Input {...field} label="Assistant Name" error={fieldState.error?.message} />
            )}
          />

          <div className="flex flex-row gap-[var(--spacing-system-l)]">
            <div className="flex-1 min-w-0">
              <Controller
                name="llmProvider"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      form.setValue('providerModel', '');
                    }}
                  >
                    <SelectTrigger label="LLM Provider" error={fieldState.error?.message}>
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
                control={form.control}
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
        </div>

        <div className="w-full md:w-[274px] shrink-0">
          <ImageUploader
            fieldLabel="Assistant Avatar"
            value={avatarUrl}
            onChange={handleAvatarChange}
            onRemove={handleAvatarRemove}
            className="[&>div]:!h-[154px] md:[&>div]:!h-[148px] [&_button]:size-10 [&_button]:p-2 md:[&_button]:size-12 md:[&_button]:p-3"
            alt={settings.assistantName}
          />
        </div>
      </div>

      <Controller
        name="answerStyle"
        control={form.control}
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
          control={form.control}
          render={({ field, fieldState }) => (
            <Textarea {...field} label="AI Model Custom Prompt" error={fieldState.error?.message} rows={6} />
          )}
        />
      )}

      <span className="text-h2 text-ods-text-primary mt-8">Assistant Quick Actions</span>

      <div className="flex flex-col gap-[var(--spacing-system-xl)]">
        {quickActionFields.map((field, index) => (
          <QuickActionCard
            key={field.id}
            index={index}
            control={form.control}
            onRemove={() => removeQuickAction(index)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="transparent"
        onClick={addQuickAction}
        leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
        className="self-start"
      >
        Add Quick Action
      </Button>
    </form>
  );
}

interface QuickActionCardProps {
  index: number;
  control: Control<CustomerAiAssistantFormValues>;
  onRemove: () => void;
}

function QuickActionCard({ index, control, onRemove }: QuickActionCardProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-m)] bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-l)]">
      <div className="flex items-end gap-[var(--spacing-system-l)]">
        <div className="flex-1 min-w-0">
          <Controller
            name={`quickActions.${index}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <Input {...field} label="Action Name" error={fieldState.error?.message} />
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          aria-label="Remove quick action"
          leftIcon={<TrashIcon className="w-5 h-5" />}
          className="[&_svg]:!text-ods-error"
        />
      </div>

      <Controller
        name={`quickActions.${index}.instructions`}
        control={control}
        render={({ field, fieldState }) => (
          <Textarea {...field} label="Action Instructions" error={fieldState.error?.message} rows={4} />
        )}
      />
    </div>
  );
}
