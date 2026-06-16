import { z } from 'zod';
import type { FaeSettings } from './fae-settings';
import { quickActionSchema } from './quick-action.types';

export const MINGO_AI_CHAT_FORM_ID = 'ai-settings-mingo-ai-chat-form';

export const mingoAiChatSchema = z.object({
  quickActions: z.array(quickActionSchema),
});

export type MingoAiChatFormValues = z.infer<typeof mingoAiChatSchema>;

// DEMO: Mingo reads the shared Fae quickActions until its own settings
// query/mutation exists on the BE.
export function getMingoAiChatDefaults(settings: FaeSettings): MingoAiChatFormValues {
  return {
    quickActions: settings.quickActions ?? [],
  };
}
