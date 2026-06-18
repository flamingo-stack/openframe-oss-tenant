import { z } from 'zod';
import type { AiSettings } from './ai-settings';
import { quickActionSchema } from './quick-action.types';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

export const mingoAiChatSchema = z.object({
  quickActions: z.array(quickActionSchema),
});

export type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

// Mingo edits the ADMIN agent's quick actions (its own per-agent settings).
export function getMingoAiChatDefaults(settings: AiSettings): MingoAiChatFormValues {
  return {
    quickActions: settings.quickActions ?? [],
  };
}
