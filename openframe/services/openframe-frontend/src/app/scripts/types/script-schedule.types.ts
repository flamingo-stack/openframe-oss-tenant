import { format } from 'date-fns'
import { z } from 'zod'

// ============ API Response Types ============

export interface ScriptScheduleAction {
  type: 'script'
  script: number
  name: string
  timeout: number
  script_args: string[]
  env_vars: string[]
}

export interface ScriptScheduleListItem {
  id: number
  name: string
  task_type: ScriptScheduleTaskType
  run_time_date: string
  enabled: boolean
  task_supported_platforms: string[]
  actions_count: number
  agents_count: number
}

export interface ScriptScheduleAgent {
  agent_id: string
  hostname: string
  plat: string
  operating_system: string
  time_zone: string
  client_name: string
  site_name: string
}

export interface ScriptScheduleHistoryEntry {
  id: number
  agent_id: string
  agent_hostname: string
  agent_platform: string
  organization: string
  retcode: number
  stdout: string
  stderr: string
  execution_time: string
  last_run: string
  status: 'passing' | 'failing' | 'pending'
  sync_status: 'synced' | 'not_synced' | 'pending'
}

export interface ScriptScheduleHistoryResponse {
  total: number
  limit: number
  offset: number
  results: ScriptScheduleHistoryEntry[]
}

export interface ScriptScheduleDetail {
  id: number
  managed_task_id: number
  name: string
  task_type: ScriptScheduleTaskType
  run_time_date: string
  daily_interval: number | null
  weekly_interval: number | null
  run_time_bit_weekdays: number | null
  monthly_days_of_month: number | null
  monthly_months_of_year: number | null
  monthly_weeks_of_month: number | null
  task_supported_platforms: string[]
  enabled: boolean
  actions: ScriptScheduleAction[]
  assigned_agents: ScriptScheduleAgent[]
  last_runs: ScriptScheduleHistoryEntry[]
}

export interface AgentsModifyResponse {
  agents_count: number
  task_results_created: number
  task_results_deleted: number
}

// ============ Request Payload Types ============

export type ScriptScheduleTaskType = 'runonce' | 'daily' | 'weekly' | 'monthly' | 'monthlydow'

export interface CreateScriptSchedulePayload {
  name: string
  task_type: ScriptScheduleTaskType
  run_time_date: string
  daily_interval?: number | null
  weekly_interval?: number | null
  run_time_bit_weekdays?: number | null
  monthly_days_of_month?: number | null
  monthly_months_of_year?: number | null
  monthly_weeks_of_month?: number | null
  task_supported_platforms?: string[]
  enabled: boolean
  actions: ScriptScheduleAction[]
}

export type UpdateScriptSchedulePayload = Partial<CreateScriptSchedulePayload>

// ============ Form Types ============

export type RepeatPeriod = 'day' | 'week' | 'month'

export const REPEAT_PERIOD_OPTIONS: { label: string; value: RepeatPeriod }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

export const WEEKDAYS = [
  { label: 'Mon', bit: 0 },
  { label: 'Tue', bit: 1 },
  { label: 'Wed', bit: 2 },
  { label: 'Thu', bit: 3 },
  { label: 'Fri', bit: 4 },
  { label: 'Sat', bit: 5 },
  { label: 'Sun', bit: 6 },
] as const

export const PLATFORMS = ['windows', 'linux', 'darwin'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform, string> = {
  windows: 'Windows',
  linux: 'Linux',
  darwin: 'MacOS',
}

// ============ Zod Schemas ============

const scheduleActionSchema = z.object({
  script: z.number().min(1, 'Please select a script'),
  name: z.string().min(1, 'Name is required'),
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  script_args: z.array(z.object({ id: z.string(), key: z.string(), value: z.string() })),
  env_vars: z.array(z.object({ id: z.string(), key: z.string(), value: z.string() })),
})

export type ScheduleActionFormData = z.infer<typeof scheduleActionSchema>

export const createScheduleFormSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(255),
  note: z.string().optional(),
  scheduledDate: z.date({ message: 'Please select a schedule date' }),
  repeatEnabled: z.boolean(),
  repeatInterval: z.number().min(1),
  repeatPeriod: z.enum(['day', 'week', 'month']),
  weekdays: z.number(),
  supportedPlatforms: z.array(z.string()).min(1, 'Select at least one platform'),
  enabled: z.boolean(),
  actions: z.array(scheduleActionSchema).min(1, 'Add at least one script action'),
})

export type CreateScheduleFormData = z.infer<typeof createScheduleFormSchema>

// ============ Utility Functions ============

/**
 * Format a Date as Zulu string using local date components (no timezone shift).
 * The user picks a time in the date picker — we treat it as UTC.
 * Output: "yyyy-MM-dd'T'HH:mm:ss'Z'"
 */
export function toZuluDateString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
}

/**
 * Parse a Zulu/UTC date string into a local Date whose local components
 * match the UTC values. Ensures the date picker shows the same time as stored.
 */
export function parseZuluToLocalDate(isoString: string): Date {
  const d = new Date(isoString)
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  )
}

export function getRepeatLabel(schedule: ScriptScheduleDetail): string {
  switch (schedule.task_type) {
    case 'runonce':
      return 'Once'
    case 'daily':
      return schedule.daily_interval === 1
        ? '1 Day'
        : `${schedule.daily_interval} Days`
    case 'weekly':
      return schedule.weekly_interval === 1
        ? '1 Week'
        : `${schedule.weekly_interval} Weeks`
    case 'monthly':
    case 'monthlydow':
      return 'Monthly'
    default:
      return schedule.task_type
  }
}

export function formatScheduleDate(isoDate: string): { date: string; time: string } {
  const d = new Date(isoDate)
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
  return { date, time }
}

export function buildTaskTypeFromForm(
  repeatEnabled: boolean,
  repeatPeriod: RepeatPeriod,
): ScriptScheduleTaskType {
  if (!repeatEnabled) return 'runonce'
  switch (repeatPeriod) {
    case 'day':
      return 'daily'
    case 'week':
      return 'weekly'
    case 'month':
      return 'monthly'
    default:
      return 'runonce'
  }
}

export function scheduleDetailToFormData(schedule: ScriptScheduleDetail): CreateScheduleFormData {
  const repeatEnabled = schedule.task_type !== 'runonce'

  let repeatPeriod: RepeatPeriod = 'day'
  let repeatInterval = 1
  if (schedule.task_type === 'daily') {
    repeatPeriod = 'day'
    repeatInterval = schedule.daily_interval ?? 1
  } else if (schedule.task_type === 'weekly') {
    repeatPeriod = 'week'
    repeatInterval = schedule.weekly_interval ?? 1
  } else if (schedule.task_type === 'monthly' || schedule.task_type === 'monthlydow') {
    repeatPeriod = 'month'
    repeatInterval = 1
  }

  const actions: ScheduleActionFormData[] = schedule.actions.map((a) => ({
    script: a.script,
    name: a.name,
    timeout: a.timeout,
    script_args: a.script_args.map((arg) => {
      const [key, ...rest] = arg.includes('=') ? arg.split('=') : [arg]
      return { id: crypto.randomUUID(), key, value: rest.join('=') }
    }),
    env_vars: a.env_vars.map((env) => {
      const [key, ...rest] = env.includes('=') ? env.split('=') : [env]
      return { id: crypto.randomUUID(), key, value: rest.join('=') }
    }),
  }))

  return {
    name: schedule.name,
    note: '',
    scheduledDate: parseZuluToLocalDate(schedule.run_time_date),
    repeatEnabled: Boolean(repeatEnabled),
    repeatInterval,
    repeatPeriod,
    weekdays: schedule.run_time_bit_weekdays ?? 0,
    supportedPlatforms: schedule.task_supported_platforms,
    enabled: schedule.enabled,
    actions,
  }
}

export function buildCreatePayload(formData: CreateScheduleFormData): CreateScriptSchedulePayload {
  const taskType = buildTaskTypeFromForm(formData.repeatEnabled, formData.repeatPeriod)

  const actions: ScriptScheduleAction[] = formData.actions.map((a) => ({
    type: 'script' as const,
    script: a.script,
    name: a.name,
    timeout: a.timeout,
    script_args: a.script_args
      .filter((arg) => arg.key.trim())
      .map((arg) => (arg.value ? `${arg.key}=${arg.value}` : arg.key)),
    env_vars: a.env_vars
      .filter((env) => env.key.trim())
      .map((env) => (env.value ? `${env.key}=${env.value}` : env.key)),
  }))

  const payload: CreateScriptSchedulePayload = {
    name: formData.name,
    task_type: taskType,
    run_time_date: toZuluDateString(formData.scheduledDate),
    task_supported_platforms: formData.supportedPlatforms,
    enabled: formData.enabled,
    actions,
  }

  if (taskType === 'daily') {
    payload.daily_interval = formData.repeatInterval
  } else if (taskType === 'weekly') {
    payload.weekly_interval = formData.repeatInterval
    payload.run_time_bit_weekdays = formData.weekdays || null
  } else if (taskType === 'monthly') {
    payload.monthly_months_of_year = 4095 // all months by default
    payload.monthly_days_of_month = null
  }

  return payload
}
