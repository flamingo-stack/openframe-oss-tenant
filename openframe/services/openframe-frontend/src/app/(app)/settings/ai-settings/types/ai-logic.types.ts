import { z } from 'zod';
import type { AgentAiConfig, AgentAiConfigInput } from './ai-settings';
import { quickActionSchema } from './quick-action.types';

/**
 * Shared AI-logic form fields (provider, model, answer style, custom prompt,
 * quick actions) used by both the CLIENT (customer) and ADMIN (Mingo) tabs.
 * Each tab composes this with `.extend()` / `.refine()` for its own fields.
 */
export const aiLogicShape = {
  llmProvider: z.enum(['ANTHROPIC', 'OPENAI', 'GOOGLE_GEMINI']),
  providerModel: z.string().min(1, 'Provider model is required'),
  answerStyle: z.enum(['SHORT', 'STANDARD', 'DETAILED', 'CUSTOM']),
  customPrompt: z.string().optional(),
  quickActions: z.array(quickActionSchema),
} as const;

export const aiLogicSchema = z.object(aiLogicShape);

export type AiLogicFormValues = z.infer<typeof aiLogicSchema>;

/** Custom prompt is required only when the answer style is CUSTOM. */
export function requireCustomPrompt(data: { answerStyle: string; customPrompt?: string }): boolean {
  return data.answerStyle !== 'CUSTOM' || (data.customPrompt?.trim().length ?? 0) > 0;
}

export function getAiLogicDefaults(config: AgentAiConfig): AiLogicFormValues {
  return {
    llmProvider: config.llmProvider,
    providerModel: config.providerModel,
    answerStyle: config.answerStyle ?? 'STANDARD',
    customPrompt: config.customPrompt ?? '',
    quickActions: config.quickActions ?? [],
  };
}

/** Maps the AI-logic form fields to the GraphQL `AgentAiConfigInput`. */
export function toAgentAiConfigInput(values: AiLogicFormValues): AgentAiConfigInput {
  return {
    llmProvider: values.llmProvider,
    providerModel: values.providerModel,
    answerStyle: values.answerStyle,
    customPrompt: values.answerStyle === 'CUSTOM' ? values.customPrompt : undefined,
    quickActions: values.quickActions,
  };
}
