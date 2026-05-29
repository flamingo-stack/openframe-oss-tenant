import { z } from 'zod';
import type { FaeSettings } from './fae-settings';

export const CUSTOMER_AI_ASSISTANT_FORM_ID = 'ai-settings-customer-ai-assistant-form';

export const customerAiAssistantSchema = z.object({
  assistantName: z.string().min(1, 'Assistant name is required'),
  llmProvider: z.enum(['ANTHROPIC', 'OPENAI', 'GOOGLE_GEMINI']),
  providerModel: z.string().min(1, 'Provider model is required'),
});

export type CustomerAiAssistantFormValues = z.infer<typeof customerAiAssistantSchema>;

export function getCustomerAiAssistantDefaults(settings: FaeSettings): CustomerAiAssistantFormValues {
  return {
    assistantName: settings.assistantName,
    llmProvider: settings.llmProvider,
    providerModel: settings.providerModel,
  };
}
