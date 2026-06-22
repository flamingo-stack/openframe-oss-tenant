import { z } from 'zod';
import { aiLogicShape, getAiLogicDefaults, requireCustomPrompt, toAgentAiConfigInput } from './ai-logic.types';
import type { AgentAiConfig, AgentAiConfigInput, ClientView, ClientViewInput } from './ai-settings';

export const CUSTOMER_AI_ASSISTANT_FORM_ID = 'ai-settings-customer-ai-assistant-form';

// CLIENT screen edits both collections: the client view (appearance) and the
// CLIENT AgentAiConfig (AI logic + quick actions).
export const customerAiAssistantSchema = z
  .object({
    assistantName: z.string().min(1, 'Assistant name is required'),
    applicationTheme: z.enum(['DARK', 'LIGHT', 'SYSTEM']),
    accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a valid hex color (e.g. #F357BB)'),
    ...aiLogicShape,
  })
  .refine(requireCustomPrompt, {
    message: 'Custom prompt is required',
    path: ['customPrompt'],
  });

export type CustomerAiAssistantFormValues = z.infer<typeof customerAiAssistantSchema>;

/** The two BE payloads a CLIENT save produces (written by separate mutations). */
export interface CustomerAiAssistantSubmit {
  ai: AgentAiConfigInput;
  view: ClientViewInput;
}

export function getCustomerAiAssistantDefaults(
  aiConfig: AgentAiConfig,
  view: ClientView,
): CustomerAiAssistantFormValues {
  return {
    assistantName: view.assistantName,
    applicationTheme: view.applicationTheme,
    accentColor: view.accentColor,
    ...getAiLogicDefaults(aiConfig),
  };
}

export function toCustomerAiAssistantSubmit(values: CustomerAiAssistantFormValues): CustomerAiAssistantSubmit {
  return {
    ai: toAgentAiConfigInput(values),
    view: {
      assistantName: values.assistantName,
      applicationTheme: values.applicationTheme,
      accentColor: values.accentColor,
    },
  };
}
