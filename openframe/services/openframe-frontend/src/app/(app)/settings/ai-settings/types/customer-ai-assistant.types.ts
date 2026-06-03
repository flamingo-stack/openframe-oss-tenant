import { z } from 'zod';
import type { FaeSettings } from './fae-settings';

export const CUSTOMER_AI_ASSISTANT_FORM_ID = 'ai-settings-customer-ai-assistant-form';

export const customerAiAssistantSchema = z
  .object({
    assistantName: z.string().min(1, 'Assistant name is required'),
    llmProvider: z.enum(['ANTHROPIC', 'OPENAI', 'GOOGLE_GEMINI']),
    providerModel: z.string().min(1, 'Provider model is required'),
    applicationTheme: z.enum(['DARK', 'LIGHT', 'SYSTEM']),
    accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a valid hex color (e.g. #F357BB)'),
    answerStyle: z.enum(['SHORT', 'STANDARD', 'DETAILED', 'CUSTOM']),
    customPrompt: z.string().optional(),
    quickActions: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Action name is required'),
        instructions: z.string().min(1, 'Action instructions are required'),
      }),
    ),
  })
  .refine(data => data.answerStyle !== 'CUSTOM' || (data.customPrompt?.trim().length ?? 0) > 0, {
    message: 'Custom prompt is required',
    path: ['customPrompt'],
  });

export type CustomerAiAssistantFormValues = z.infer<typeof customerAiAssistantSchema>;

export function getCustomerAiAssistantDefaults(settings: FaeSettings): CustomerAiAssistantFormValues {
  return {
    assistantName: settings.assistantName,
    llmProvider: settings.llmProvider,
    providerModel: settings.providerModel,
    applicationTheme: settings.applicationTheme,
    accentColor: settings.accentColor,
    answerStyle: settings.answerStyle ?? 'STANDARD',
    customPrompt: settings.customPrompt ?? '',
    quickActions: settings.quickActions ?? [],
  };
}
