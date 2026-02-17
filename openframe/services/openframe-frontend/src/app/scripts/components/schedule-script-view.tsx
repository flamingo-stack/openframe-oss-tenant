'use client'

import {
  DetailPageContainer,
  LoadError,
  NotFoundError,
  ScriptArguments,
  ScriptInfoSection,
} from '@flamingo-stack/openframe-frontend-core'
import {
  CheckboxBlock,
  DatePickerInputSimple,
  Input,
  Label,
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { getTacticalAgentId } from '../../devices/utils/device-action-utils'
import { useDeviceFilter } from '../hooks/use-device-filter'
import { useDeviceSelection } from '../hooks/use-device-selection'
import { useRunScriptData } from '../hooks/use-run-script-data'
import { scriptArgumentSchema } from '../types/edit-script.types'
import { getDevicePrimaryId, normalizeOsOrNull } from '../utils/device-helpers'
import { parseKeyValues, serializeKeyValues } from '../utils/script-key-values'
import { DeviceSelectionPanel } from './device-selection-panel'
import { ScheduleScriptLoader } from './schedule-script-loader'

interface ScheduleScriptViewProps {
  scriptId: string
}

const scheduleFormSchema = z.object({
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  scriptArgs: z.array(scriptArgumentSchema),
  envVars: z.array(scriptArgumentSchema),
  note: z.string().optional(),
  scheduledDate: z.date({ message: 'Please select a schedule date' }),
  repeatEnabled: z.boolean(),
})

type ScheduleFormData = z.infer<typeof scheduleFormSchema>

export function ScheduleScriptView({ scriptId }: ScheduleScriptViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  const {
    scriptDetails,
    isLoadingScript,
    scriptError,
    devices: allDevices,
    isLoadingDevices,
    devicesError,
  } = useRunScriptData({ scriptId })

  const {
    searchTerm, setSearchTerm,
    selectedOrgIds, setSelectedOrgIds,
    organizationOptions,
    filteredDevices,
  } = useDeviceFilter({ devices: allDevices })

  const {
    selectedIds, selectedCount,
    toggleSelect, selectAllDisplayed, clearSelection,
  } = useDeviceSelection()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      timeout: 90,
      scriptArgs: [],
      envVars: [],
      note: '',
      scheduledDate: undefined,
      repeatEnabled: false,
    },
  })

  useEffect(() => {
    if (scriptDetails) {
      reset({
        timeout: Number(scriptDetails.default_timeout) || 90,
        scriptArgs: parseKeyValues(scriptDetails.args),
        envVars: parseKeyValues(scriptDetails.env_vars),
        note: '',
        scheduledDate: undefined,
        repeatEnabled: false,
      })
    }
  }, [scriptDetails, reset])

  const handleBack = useCallback(() => {
    router.push(`/scripts/details/${scriptId}`)
  }, [router, scriptId])

  const onSubmit = useCallback(async (data: ScheduleFormData) => {
    if (selectedCount === 0) {
      toast({ title: 'No devices selected', description: 'Please select at least one device.', variant: 'destructive' })
      return
    }

    try {
      const selectedDevices = filteredDevices.filter(d => selectedIds.has(getDevicePrimaryId(d)))
      const selectedAgentIds = selectedDevices
        .map(d => getTacticalAgentId(d))
        .filter((id): id is string => !!id)

      if (selectedAgentIds.length === 0) {
        toast({ title: 'No compatible agents', description: 'Selected devices have no Tactical agent IDs.', variant: 'destructive' })
        return
      }

      const runTimeDate = data.scheduledDate.toISOString()

      const platforms = selectedDevices
        .map(d => normalizeOsOrNull(d.osType || d.operating_system))
        .filter((v): v is 'windows' | 'linux' | 'darwin' => v !== null)
      const uniquePlatforms = [...new Set(platforms)]

      const taskData = {
        actions: [{
          type: 'script' as const,
          name: scriptDetails?.name || 'Scheduled Script',
          script: Number(scriptDetails?.id),
          timeout: data.timeout,
          script_args: serializeKeyValues(data.scriptArgs),
          env_vars: serializeKeyValues(data.envVars),
          run_as_user: Boolean(scriptDetails?.run_as_user),
        }],
        name: data.note || scriptDetails?.name || 'Scheduled Script',
        task_type: data.repeatEnabled ? 'daily' as const : 'runonce' as const,
        run_time_date: runTimeDate,
        expire_date: null,
        daily_interval: 1,
        weekly_interval: 1,
        run_time_bit_weekdays: null,
        monthly_days_of_month: null,
        monthly_months_of_year: null,
        monthly_weeks_of_month: null,
        random_task_delay: null,
        task_repetition_interval: null,
        task_repetition_duration: null,
        stop_task_at_duration_end: false,
        task_instance_policy: 0,
        run_asap_after_missed: true,
        remove_if_not_scheduled: false,
        continue_on_error: true,
        alert_severity: 'info' as const,
        collector_all_output: false,
        custom_field: null,
        assigned_check: null,
        task_supported_platforms: uniquePlatforms,
      }

      type CreateScheduledTaskResult = Awaited<ReturnType<typeof tacticalApiClient.createScheduledTask>>

      const results = await Promise.allSettled<CreateScheduledTaskResult>(
        selectedAgentIds.map(agentId =>
          tacticalApiClient.createScheduledTask(agentId, taskData)
        )
      )

      const succeeded = results.reduce(
        (count, r) => count + (r.status === 'fulfilled' && r.value.ok ? 1 : 0),
        0
      )
      const failed = results.length - succeeded

      if (failed > 0 && succeeded === 0) {
        throw new Error(`All ${failed} schedule(s) failed`)
      }

      const description = failed > 0
        ? `${succeeded} scheduled, ${failed} failed.`
        : `Script scheduled for ${succeeded} agent(s).`
      toast({ title: 'Schedule created', description, variant: failed > 0 ? 'warning' : 'success' })
      router.push(`/scripts/details/${scriptId}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create schedule'
      toast({ title: 'Schedule failed', description: msg, variant: 'destructive' })
    }
  }, [selectedCount, filteredDevices, selectedIds, scriptDetails, toast, router, scriptId])

  const onFormError = useCallback((formErrors: Record<string, { message?: string }>) => {
    const firstError = Object.values(formErrors)[0]
    if (firstError?.message) {
      toast({ title: 'Validation error', description: firstError.message, variant: 'destructive' })
    }
  }, [toast])

  const actions = useMemo(() => [
    {
      label: 'Save Schedule',
      onClick: handleSubmit(onSubmit, onFormError),
      variant: 'primary' as const,
      disabled: selectedCount === 0,
      loading: isSubmitting,
    }
  ], [handleSubmit, onSubmit, onFormError, selectedCount, isSubmitting])

  if (isLoadingScript) {
    return <ScheduleScriptLoader />
  }

  if (scriptError) {
    return <LoadError message={`Error loading script: ${scriptError}`} />
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />
  }

  return (
    <DetailPageContainer
      title="Schedule Script"
      backButton={{ label: 'Back to Script Details', onClick: handleBack }}
      actions={actions}
    >
      <div className="flex-1 overflow-auto">
        <ScriptInfoSection
          headline={scriptDetails.name || 'Untitled Script'}
          subheadline={scriptDetails.description}
          shellType={scriptDetails.shell}
          supportedPlatforms={scriptDetails.supported_platforms}
          category={scriptDetails.category || 'Uncategorized'}
        />

        {/* Timeout */}
        <div className="pt-6">
          <Label className="text-ods-text-primary font-semibold text-lg">Timeout</Label>
          <Controller
            name="timeout"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                className="md:max-w-[320px] w-full"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                endAdornment={<span className="text-ods-text-secondary text-sm">Seconds</span>}
              />
            )}
          />
        </div>

        {/* Script Arguments & Environment Vars */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Controller
            name="scriptArgs"
            control={control}
            render={({ field }) => (
              <ScriptArguments
                arguments={field.value}
                onArgumentsChange={field.onChange}
                keyPlaceholder="Key"
                valuePlaceholder="Enter Value (empty=flag)"
                addButtonLabel="Add Script Argument"
                titleLabel="Script Arguments"
              />
            )}
          />
          <Controller
            name="envVars"
            control={control}
            render={({ field }) => (
              <ScriptArguments
                arguments={field.value}
                onArgumentsChange={field.onChange}
                keyPlaceholder="Key"
                valuePlaceholder="Enter Value"
                addButtonLabel="Add Environment Var"
                titleLabel="Environment Vars"
              />
            )}
          />
        </div>

        {/* Note, Date/Time, Repeat */}
        <div className="pt-6">
          <Label className="text-ods-text-primary font-semibold text-lg">Note</Label>
          <div className="flex flex-wrap items-end gap-4 mt-2">
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Enter Note Here"
                  value={field.value}
                  onChange={field.onChange}
                  className="md:w-[240px] w-full"
                />
              )}
            />
            <Controller
              name="scheduledDate"
              control={control}
              render={({ field }) => (
                <DatePickerInputSimple
                  placeholder="Select Date"
                  value={field.value}
                  onChange={field.onChange}
                  showTime
                  className="md:w-auto w-full"
                />
              )}
            />
            <Controller
              name="repeatEnabled"
              control={control}
              render={({ field }) => (
                <CheckboxBlock
                  label="Repeat Script Run"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="md:max-w-[320px] w-full"
                />
              )}
            />
          </div>
        </div>

        <DeviceSelectionPanel
          devices={filteredDevices}
          isLoading={isLoadingDevices}
          error={devicesError}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          organizationOptions={organizationOptions}
          selectedOrgIds={selectedOrgIds}
          onOrgIdsChange={setSelectedOrgIds}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={() => selectAllDisplayed(filteredDevices)}
          onClearSelection={clearSelection}
          selectedCount={selectedCount}
        />
      </div>
    </DetailPageContainer>
  )
}

export default ScheduleScriptView
