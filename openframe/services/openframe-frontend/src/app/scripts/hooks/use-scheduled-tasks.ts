'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tacticalApiClient } from '@lib/tactical-api-client'

// ============ Types ============

export interface ScheduledTaskAction {
  type: 'script'
  name: string
  script: number
  timeout: number
  script_args: string[]
  env_vars: string[]
  run_as_user: boolean
}

export interface ScheduledTask {
  id: number
  name: string
  task_type: 'daily' | 'weekly' | 'monthly' | 'runonce'
  run_time_date: string
  expire_date: string | null
  daily_interval: number
  weekly_interval: number
  run_time_bit_weekdays: number | null
  monthly_days_of_month: number[] | null
  monthly_months_of_year: number[] | null
  monthly_weeks_of_month: number[] | null
  actions: ScheduledTaskAction[]
  agent: string
  enabled: boolean
  continue_on_error: boolean
  run_asap_after_missed: boolean
  custom_field: any
  assigned_check: any
}

// ============ Query Keys ============

export const scheduledTasksQueryKeys = {
  all: ['scheduled-tasks'] as const,
  byScript: (scriptId: string) => [...scheduledTasksQueryKeys.all, 'by-script', scriptId] as const,
}

// ============ API Functions ============

async function fetchScheduledTasksByScript(scriptId: string): Promise<ScheduledTask[]> {
  const res = await tacticalApiClient.getScheduledTasksByScript(scriptId)
  if (!res.ok) {
    throw new Error(res.error || `Failed to load scheduled tasks (${res.status})`)
  }
  return res.data || []
}

async function deleteScheduledTaskApi(taskId: string): Promise<void> {
  const res = await tacticalApiClient.deleteScheduledTask(taskId)
  if (!res.ok) {
    throw new Error(res.error || `Failed to delete scheduled task (${res.status})`)
  }
}

// ============ Hook ============

export function useScheduledTasks(scriptId: string) {
  const queryClient = useQueryClient()

  const scheduledTasksQuery = useQuery({
    queryKey: scheduledTasksQueryKeys.byScript(scriptId),
    queryFn: () => fetchScheduledTasksByScript(scriptId),
    enabled: !!scriptId,
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteScheduledTaskApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledTasksQueryKeys.byScript(scriptId) })
    },
  })

  const deleteTask = (
    taskId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => {
        options?.onSuccess?.()
      },
      onError: (error) => {
        options?.onError?.(error as Error)
      },
    })
  }

  return {
    // Data
    scheduledTasks: scheduledTasksQuery.data ?? [],

    // Loading & error states
    isLoading: scheduledTasksQuery.isLoading,
    error: scheduledTasksQuery.error?.message ?? null,

    // Refetch
    refetch: scheduledTasksQuery.refetch,

    // Mutations
    deleteTask,
    isDeleting: deleteTaskMutation.isPending,

    // Raw query for advanced use cases
    scheduledTasksQuery,
  }
}
