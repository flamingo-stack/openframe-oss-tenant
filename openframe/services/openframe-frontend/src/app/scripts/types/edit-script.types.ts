import { z } from 'zod'

export const scriptArgumentSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
})

export const editScriptSchema = z.object({
  name: z.string().min(1, 'Script name is required'),
  shell: z.string().min(1, 'Shell type is required'),
  default_timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  args: z.array(scriptArgumentSchema),
  script_body: z.string(),
  run_as_user: z.boolean(),
  env_vars: z.array(scriptArgumentSchema),
  description: z.string(),
  supported_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  category: z.string().min(1, 'Category is required'),
})

export type EditScriptFormData = z.infer<typeof editScriptSchema>

export const CATEGORIES = ['System Maintenance', 'Security', 'Network', 'Monitoring', 'Backup', 'Custom']

export const EDIT_SCRIPT_DEFAULT_VALUES: EditScriptFormData = {
  name: '',
  shell: 'powershell',
  default_timeout: 90,
  args: [],
  script_body: '',
  run_as_user: false,
  env_vars: [],
  description: '',
  supported_platforms: ['windows'],
  category: 'System Maintenance',
}
