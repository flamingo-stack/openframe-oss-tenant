import { ClaudeIcon, GoogleGeminiIcon, OpenAiIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import type { ComponentType, SVGProps } from 'react';
import type { AIProvider, AnswerStyle, ApplicationTheme } from '../types/fae-settings';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const LLM_PROVIDER_LABEL: Record<AIProvider, string> = {
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI',
  GOOGLE_GEMINI: 'Google',
};

export const LLM_PROVIDER_ICON: Record<AIProvider, IconComponent> = {
  ANTHROPIC: ClaudeIcon as unknown as IconComponent,
  OPENAI: OpenAiIcon as unknown as IconComponent,
  GOOGLE_GEMINI: GoogleGeminiIcon as unknown as IconComponent,
};

export const LLM_PROVIDER_OPTIONS: AIProvider[] = ['ANTHROPIC', 'OPENAI', 'GOOGLE_GEMINI'];

export interface ProviderModelOption {
  value: string;
  label: string;
}

// Placeholder model lists per provider. Replace with the backend-provided
// `supportedModels` once the FaeSettings schema lands.
export const PROVIDER_MODELS: Record<AIProvider, ProviderModelOption[]> = {
  ANTHROPIC: [
    { value: 'Claude Opus 4.1', label: 'Claude Opus 4.1' },
    { value: 'Claude Sonnet 4', label: 'Claude Sonnet 4' },
  ],
  OPENAI: [
    { value: 'GPT-4o', label: 'GPT-4o' },
    { value: 'GPT-4.1', label: 'GPT-4.1' },
  ],
  GOOGLE_GEMINI: [
    { value: 'Gemini 2.5 Pro', label: 'Gemini 2.5 Pro' },
    { value: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash' },
  ],
};

export const APPLICATION_THEME_LABEL: Record<ApplicationTheme, string> = {
  DARK: 'Dark',
  LIGHT: 'Light',
  SYSTEM: 'System',
};

export const ANSWER_STYLE_LABEL: Record<AnswerStyle, string> = {
  SHORT: 'Short',
  STANDARD: 'Standard',
  DETAILED: 'Detailed',
  CUSTOM: 'Custom',
};
