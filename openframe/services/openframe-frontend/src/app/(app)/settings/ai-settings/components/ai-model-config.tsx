'use client';

import {
  GoogleGeminiIcon,
  Label,
  OpenAiIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@flamingo-stack/openframe-frontend-core';
import { AiRobotIcon, ClaudeIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useAiConfiguration } from '../../hooks/use-ai-configuration';

const PROVIDER_CONFIG = {
  ANTHROPIC: { apiKey: 'anthropic', label: 'Anthropic', icon: ClaudeIcon },
  OPENAI: { apiKey: 'openai', label: 'OpenAI', icon: OpenAiIcon },
  GOOGLE_GEMINI: { apiKey: 'google-gemini', label: 'Google', icon: GoogleGeminiIcon },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIG;

const API_KEY_TO_PROVIDER: Record<string, ProviderKey> = {
  anthropic: 'ANTHROPIC',
  openai: 'OPENAI',
  'google-gemini': 'GOOGLE_GEMINI',
  google: 'GOOGLE_GEMINI',
};

export interface AiModelConfigHandle {
  /** Persists the provider/model when changed. Returns `false` (and toasts)
   *  when the selection is incomplete, so the caller can abort its own save. */
  save: () => Promise<boolean>;
}

interface AiModelConfigProps {
  isEditMode: boolean;
}

/**
 * AI model selection (LLM Provider + Provider Model). Self-contained: owns its
 * config fetch/save through `useAiConfiguration`, and exposes `save()` via ref
 * so the host form can persist it on submit. Relocated out of the Guardrails
 * tab; currently rendered in the (feature-flagged) Mingo AI Chat tab.
 */
export const AiModelConfig = forwardRef<AiModelConfigHandle, AiModelConfigProps>(function AiModelConfig(
  { isEditMode },
  ref,
) {
  const { toast } = useToast();
  const { configuration, supportedModels, isLoading, isSaving, updateConfiguration } = useAiConfiguration();

  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Mirror the saved config while not editing — this also discards unsaved
  // edits when edit mode ends (e.g. on tab switch).
  useEffect(() => {
    if (configuration && !isEditMode) {
      setSelectedProvider(configuration.provider);
      setSelectedModel(configuration.modelName);
    }
  }, [configuration, isEditMode]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setSelectedModel('');
  };

  const getAvailableModels = () => {
    if (!selectedProvider) return [];
    const config = PROVIDER_CONFIG[selectedProvider as ProviderKey];
    if (!config) return [];
    return supportedModels[config.apiKey as keyof typeof supportedModels] || [];
  };

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        const changed =
          !configuration || selectedProvider !== configuration.provider || selectedModel !== configuration.modelName;
        if (!changed) return true;

        if (!selectedProvider || !selectedModel) {
          toast({
            title: 'Model Required',
            description: 'Select a provider model before saving.',
            variant: 'destructive',
            duration: 5000,
          });
          return false;
        }

        try {
          await updateConfiguration({ provider: selectedProvider, modelName: selectedModel });
          return true;
        } catch {
          return false;
        }
      },
    }),
    [configuration, selectedProvider, selectedModel, toast, updateConfiguration],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const ProviderIcon =
    configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]
      ? PROVIDER_CONFIG[configuration.provider as ProviderKey].icon
      : AiRobotIcon;

  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          {isEditMode ? (
            <>
              <Label htmlFor="provider" className="text-ods-text-primary">
                LLM Provider
              </Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={isSaving}>
                <SelectTrigger
                  id="provider"
                  className="w-full bg-ods-system-greys-soft-grey border-ods-border text-ods-text-primary"
                >
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent className="bg-ods-card border-ods-border">
                  {Object.keys(supportedModels)
                    .map(apiKey => {
                      const providerKey = API_KEY_TO_PROVIDER[apiKey];
                      if (!providerKey) return null;

                      const config = PROVIDER_CONFIG[providerKey];
                      const Icon = config.icon;

                      return (
                        <SelectItem
                          key={apiKey}
                          value={providerKey}
                          className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                    .filter(Boolean)}
                </SelectContent>
              </Select>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 bg-ods-system-greys-soft-grey rounded-md">
                <span className="text-ods-text-primary font-medium">
                  {configuration && PROVIDER_CONFIG[configuration.provider as ProviderKey]?.label}
                </span>
                <ProviderIcon className="w-5 h-5 text-ods-accent" />
              </div>
              <Label className="text-ods-text-secondary text-sm block">LLM Provider</Label>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          {isEditMode ? (
            <>
              <Label htmlFor="model" className="text-ods-text-primary">
                Provider Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedProvider || isSaving}>
                <SelectTrigger
                  id="model"
                  className="w-full bg-ods-system-greys-soft-grey border-ods-border text-ods-text-primary"
                >
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="bg-ods-card border-ods-border">
                  {getAvailableModels().map(model => (
                    <SelectItem
                      key={model.modelName}
                      value={model.modelName}
                      className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{model.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <div>
              <div className="bg-ods-system-greys-soft-grey rounded-md">
                {(() => {
                  if (!configuration) return null;
                  const config = PROVIDER_CONFIG[configuration.provider as ProviderKey];
                  if (!config)
                    return <span className="text-ods-text-primary font-medium">{configuration.modelName}</span>;

                  const models = supportedModels[config.apiKey as keyof typeof supportedModels] || [];
                  const currentModel = models.find(m => m.modelName === configuration.modelName);

                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-ods-text-primary font-medium">
                        {currentModel?.displayName || configuration.modelName}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <Label className="text-ods-text-secondary text-sm block">Provider Model</Label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
