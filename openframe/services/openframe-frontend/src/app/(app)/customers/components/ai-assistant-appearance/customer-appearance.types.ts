import { z } from 'zod';
import type { ClientView } from '@/app/(app)/settings/ai-settings/types/ai-settings';

/**
 * Per-customer appearance edits only the ClientView (name, avatar, theme,
 * accent) — the AI logic config (provider/model/quick actions) is tenant-wide
 * per agent and is not overridable per organization.
 */
export const customerAppearanceSchema = z.object({
  assistantName: z.string().trim().min(1, 'Assistant name is required'),
  applicationTheme: z.enum(['DARK', 'LIGHT', 'SYSTEM']),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a valid hex color (e.g. #F357BB)'),
});

export type CustomerAppearanceFormValues = z.infer<typeof customerAppearanceSchema>;

export function getCustomerAppearanceDefaults(view: ClientView): CustomerAppearanceFormValues {
  return {
    assistantName: view.assistantName,
    applicationTheme: view.applicationTheme,
    accentColor: view.accentColor,
  };
}
