import { z } from 'zod';
import type { AgentAiConfig, AgentAiConfigInput } from './ai-settings';
import { quickActionSchema } from './quick-action.types';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

// ADMIN (Mingo): the provider/model is owned by AiModelConfig (REST), so this
// form only carries the admin quick actions, persisted via adminAiConfig.
export const mingoAiChatSchema = z.object({
  quickActions: z.array(quickActionSchema),
});

export type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

export function getMingoAiChatDefaults(config: AgentAiConfig): MingoAiChatFormValues {
  return {
    quickActions: config.quickActions ?? [],
  };
}

export function toMingoAiChatSubmit(values: MingoAiChatFormValues): AgentAiConfigInput {
  return {
    quickActions: values.quickActions,
  };
}
