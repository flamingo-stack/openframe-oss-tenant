import { z } from 'zod';

export const scriptArgumentSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
});

export const editScriptSchema = z.object({
  name: z.string().min(1, 'Please enter a script name'),
  shell: z.string().min(1, 'Please select a shell type'),
  default_timeout: z
    .number({ error: 'Please enter a valid timeout value' })
    .min(1, 'Timeout must be at least 1 second')
    .max(86400, 'Timeout must not exceed 24 hours (86400 seconds)'),
  args: z.array(scriptArgumentSchema),
  script_body: z.string(),
  run_as_user: z.boolean(),
  env_vars: z.array(scriptArgumentSchema),
  description: z.string(),
  supported_platforms: z.array(z.string()).min(1, 'Please select at least one platform'),
  category: z.string().min(1, 'Please select a category'),
});

export type EditScriptFormData = z.infer<typeof editScriptSchema>;

export const CATEGORIES = ['System Maintenance', 'Security', 'Network', 'Monitoring', 'Backup', 'Custom'];

export const EDIT_SCRIPT_DEFAULT_VALUES: EditScriptFormData = {
  name: '',
  shell: '',
  default_timeout: 90,
  args: [],
  script_body: '',
  run_as_user: false,
  env_vars: [],
  description: '',
  supported_platforms: ['windows'],
  category: '',
};
