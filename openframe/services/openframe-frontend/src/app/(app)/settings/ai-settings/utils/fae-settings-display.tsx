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
