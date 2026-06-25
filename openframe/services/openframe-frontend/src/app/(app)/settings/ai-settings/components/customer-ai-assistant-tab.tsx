'use client';

import { MonitorIcon, MoonStarIcon, Sun01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ColorPickerInput,
  ImageUploader,
  Input,
  TabSelector,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Controller } from 'react-hook-form';
import { featureFlags } from '@/lib/feature-flags';
import { useCustomerAiAssistantForm } from '../hooks/use-customer-ai-assistant-form';
import { getProviderModelLabel, useSupportedModels } from '../hooks/use-supported-models';
import type { AgentAiConfig, ClientView } from '../types/ai-settings';
import { CUSTOMER_AI_ASSISTANT_FORM_ID, type CustomerAiAssistantSubmit } from '../types/customer-ai-assistant.types';
import { AiAnswerStyleFields, AiProviderModelFields } from './ai-config-fields';
import { AiSettingsOverview } from './ai-settings-overview';
import { AiSettingsQuickActionsEditor } from './ai-settings-quick-actions-editor';
import { AiSettingsPreviews } from './previews/ai-settings-previews';

export { CUSTOMER_AI_ASSISTANT_FORM_ID } from '../types/customer-ai-assistant.types';

interface CustomerAiAssistantTabProps {
  aiConfig: AgentAiConfig;
  view: ClientView;
  isEditMode: boolean;
  onSubmit: (payload: CustomerAiAssistantSubmit) => void;
}

export function CustomerAiAssistantTab({ aiConfig, view, isEditMode, onSubmit }: CustomerAiAssistantTabProps) {
  const { form, avatarUrl, handleAvatarChange, handleAvatarRemove, handleSubmit } = useCustomerAiAssistantForm({
    aiConfig,
    view,
    onSubmit,
  });

  const { modelsByProvider } = useSupportedModels();

  const llmProvider = form.watch('llmProvider');
  const answerStyle = form.watch('answerStyle');
  const assistantName = form.watch('assistantName');
  const providerModel = form.watch('providerModel');
  const applicationTheme = form.watch('applicationTheme');
  const accentColor = form.watch('accentColor');

  // Appearance customization (theme/accent + previews, answer style, quick actions)
  // is not released yet — keep it behind the feature flag.
  const showCustomization = featureFlags.customerAiAssistantSettings.enabled();

  if (!isEditMode) {
    const modelLabel = getProviderModelLabel(modelsByProvider, aiConfig.llmProvider, aiConfig.providerModel);
    return (
      <AiSettingsOverview
        aiConfig={aiConfig}
        view={view}
        providerModelLabel={modelLabel}
        quickActions={aiConfig.quickActions}
      />
    );
  }

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

          <AiProviderModelFields
            control={form.control}
            llmProvider={llmProvider}
            modelsByProvider={modelsByProvider}
            onProviderChange={() => form.setValue('providerModel', '')}
          />
        </div>

        <div className="w-full md:w-[274px] shrink-0">
          <ImageUploader
            fieldLabel="Assistant Avatar"
            value={avatarUrl}
            onChange={handleAvatarChange}
            onRemove={handleAvatarRemove}
            className="[&>div]:!h-[154px] md:[&>div]:!h-[148px] [&_button]:size-10 [&_button]:p-2 md:[&_button]:size-12 md:[&_button]:p-3"
            alt={view.assistantName}
          />
        </div>
      </div>

      {showCustomization && (
        <>
          <div className="flex flex-col gap-[var(--spacing-system-l)] rounded-md border border-ods-border p-[var(--spacing-system-l)]">
            <div className="flex flex-col gap-[var(--spacing-system-l)] md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <Controller
                  name="applicationTheme"
                  control={form.control}
                  render={({ field }) => (
                    <TabSelector
                      label="Application Theme"
                      variant="primary"
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        { id: 'DARK', label: 'Dark', icon: <MoonStarIcon className="size-5" /> },
                        { id: 'LIGHT', label: 'Light', icon: <Sun01Icon className="size-5" /> },
                        { id: 'SYSTEM', label: 'System', icon: <MonitorIcon className="size-5" /> },
                      ]}
                    />
                  )}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-h3 text-ods-text-primary">Accent Color</p>
                <Controller
                  name="accentColor"
                  control={form.control}
                  render={({ field }) => <ColorPickerInput value={field.value} onChange={field.onChange} />}
                />
              </div>
            </div>

            <AiSettingsPreviews
              assistantName={assistantName || view.assistantName}
              avatarUrl={avatarUrl}
              accentColor={accentColor || view.accentColor}
              theme={applicationTheme}
              providerName={llmProvider}
              modelDisplayName={getProviderModelLabel(
                modelsByProvider,
                llmProvider,
                providerModel || aiConfig.providerModel,
              )}
            />
          </div>

          <AiAnswerStyleFields control={form.control} answerStyle={answerStyle} />

          <AiSettingsQuickActionsEditor control={form.control} className="mt-8" />
        </>
      )}
    </form>
  );
}
