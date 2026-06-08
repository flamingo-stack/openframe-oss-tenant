import { ClaudeIcon, GoogleGeminiIcon, OpenAiIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import type { ComponentType, SVGProps } from 'react';
import type { AIProvider, AnswerStyle, ApplicationTheme } from '../types/fae-settings';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const LLM_PROVIDER_LABEL: Record<AIProvider, string> = {
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI',
  GOOGLE_GEMINI: 'Google Gemini',
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

export interface AnswerStyleOption {
  value: AnswerStyle;
  label: string;
  description: string;
}

export const ANSWER_STYLE_OPTIONS: AnswerStyleOption[] = [
  {
    value: 'SHORT',
    label: 'Short',
    description:
      'Quick, to-the-point responses that get straight to the answer. Minimal explanations and context. Best when you need fast answers without elaboration.',
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    description:
      'Balanced, conversational responses with clear explanations. Provides enough context to understand the answer without overwhelming detail. The recommended default for most interactions.',
  },
  {
    value: 'DETAILED',
    label: 'Detailed',
    description:
      'Comprehensive, in-depth answers with examples, context, and thorough exploration of topics. Includes background information, multiple perspectives, and practical applications.',
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    description:
      'Define your own AI behavior by editing the communication rules in master prompt. Customize tone, response format, expertise level, and communication style to match your specific needs.',
  },
];
