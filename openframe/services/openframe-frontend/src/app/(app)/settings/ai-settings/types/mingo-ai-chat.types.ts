import { z } from 'zod';
import { aiLogicShape, getAiLogicDefaults, requireCustomPrompt, toAgentAiConfigInput } from './ai-logic.types';
import type { AgentAiConfig, AgentAiConfigInput } from './ai-settings';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

// ADMIN (Mingo): edits the full AI logic for the ADMIN agent — provider, model,
// answer style, custom prompt and quick actions — all persisted to the ADMIN
// AgentAiConfig. Mirrors the customer (CLIENT) tab without the appearance fields.
export const mingoAiChatSchema = z.object(aiLogicShape).refine(requireCustomPrompt, {
  message: 'Custom prompt is required',
  path: ['customPrompt'],
});

export type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

export function getMingoAiChatDefaults(config: AgentAiConfig): MingoAiChatFormValues {
  return getAiLogicDefaults(config);
}

export function toMingoAiChatSubmit(values: MingoAiChatFormValues): AgentAiConfigInput {
  return toAgentAiConfigInput(values);
}
