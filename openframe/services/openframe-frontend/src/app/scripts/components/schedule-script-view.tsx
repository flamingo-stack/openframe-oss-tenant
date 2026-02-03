'use client'

import {
  DetailPageContainer,
  DeviceType,
  LoadError,
  NotFoundError,
  ScriptArguments,
  ScriptInfoSection,
  SelectableDeviceCard,
  useSmUp,
  type ScriptArgument,
} from '@flamingo-stack/openframe-frontend-core'
import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import {
  Autocomplete,
  Button,
  CheckboxBlock,
  DatePickerInputSimple,
  Input,
  Label,
  ListLoader
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { getDeviceOperatingSystem } from '../../devices/utils/device-status'
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min'
import { useRunScriptData } from '../hooks/use-run-script-data'

interface ScheduleScriptViewProps {
  scriptId: string
}

// Zod schema for script argument
const scriptArgumentSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
})

// Main form validation schema
const scheduleFormSchema = z.object({
  timeout: z.number().min(1, 'Timeout must be at least 1 second').max(86400, 'Timeout cannot exceed 24 hours'),
  scriptArgs: z.array(scriptArgumentSchema),
  envVars: z.array(scriptArgumentSchema),
  note: z.string().optional(),
  scheduledDate: z.date({ message: 'Please select a schedule date' }),
  repeatEnabled: z.boolean(),
})

type ScheduleFormData = z.infer<typeof scheduleFormSchema>

function parseKeyValues(arr: string[] | undefined): ScriptArgument[] {
  if (!arr || arr.length === 0) return []
  return arr.map((item, index) => {
    const idx = item.indexOf('=')
    if (idx === -1) return { id: `arg-${index}`, key: item, value: '' }
    return { id: `arg-${index}`, key: item.substring(0, idx), value: item.substring(idx + 1) }
  })
}

function serializeKeyValues(pairs: ScriptArgument[]): string[] {
  return pairs
    .filter(p => p.key.trim() !== '')
    .map(p => (p.value ? `${p.key}=${p.value}` : p.key))
}

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

  // React Hook Form setup
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

  // Device search (client-side)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSmUp = useSmUp()

  // Organization filter
  const { items: allOrganizations, fetch: fetchOrgs } = useOrganizationsMin()
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])

  // Initialize form from script details
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

  // Load organizations once
  useEffect(() => {
    fetchOrgs('')
  }, [fetchOrgs])

  // Organization options for Autocomplete
  const organizationOptions = useMemo(() => {
    return allOrganizations.map(org => ({
      label: org.name,
      value: org.organizationId,
    }))
  }, [allOrganizations])

  // Client-side filtered devices (by search term + selected orgs)
  const devices = useMemo(() => {
    let filtered = allDevices
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(d => {
        const name = (d.displayName || d.hostname || '').toLowerCase()
        const os = (d.osType || d.operating_system || '').toLowerCase()
        return name.includes(term) || os.includes(term)
      })
    }
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter(d => d.organizationId && selectedOrgIds.includes(d.organizationId))
    }
    return filtered
  }, [allDevices, searchTerm, selectedOrgIds])

  const handleBack = useCallback(() => {
    router.push(`/scripts/details/${scriptId}`)
  }, [router, scriptId])

  // Device selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllDisplayed = useCallback(() => {
    const ids = devices.map(d => d.machineId || d.agent_id || d.id)
    setSelectedIds(new Set(ids as string[]))
  }, [devices])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = selectedIds.size

  const onSubmit = useCallback(async (data: ScheduleFormData) => {
    if (selectedCount === 0) {
      toast({ title: 'No devices selected', description: 'Please select at least one device.', variant: 'destructive' })
      return
    }

    try {
      const selectedDevices = devices.filter(d => selectedIds.has((d.machineId || d.agent_id || d.id) || ''))
      const selectedAgentIds = selectedDevices
        .map(d => d.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId)
        .filter((id): id is string => !!id)

      if (selectedAgentIds.length === 0) {
        toast({ title: 'No compatible agents', description: 'Selected devices have no Tactical agent IDs.', variant: 'destructive' })
        return
      }

      const runTimeDate = data.scheduledDate.toISOString()

      const normalizeOs = (os?: string): string | null => {
        const o = (os || '').toLowerCase()
        if (o.includes('win')) return 'windows'
        if (o.includes('mac') || o.includes('darwin') || o.includes('osx')) return 'darwin'
        if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian') || o.includes('centos') || o.includes('redhat')) return 'linux'
        return null
      }
      const platforms = selectedDevices
        .map(d => normalizeOs(d.osType || d.operating_system))
        .filter((v): v is string => v !== null)
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
  }, [selectedCount, devices, selectedIds, scriptDetails, toast, router, scriptId])

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
    return <ListLoader />
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
        {/* Script Info Section */}
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
          {/* Script Arguments */}
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

          {/* Environment Variables */}
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

        {/* Search by Device & Organization */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <div className="text-ods-text-primary font-semibold text-lg">Search by Device</div>
            <Input
              startAdornment={<SearchIcon size={20} />}
              placeholder="Search for Devices"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-col gap-3 hidden md:flex">
            <div className="text-ods-text-primary font-semibold text-lg">Filter by Organization</div>
            <div className="w-full">
              <Autocomplete
                placeholder="Select Organization"
                options={organizationOptions}
                value={selectedOrgIds}
                onChange={setSelectedOrgIds}
                limitTags={2}
              />
            </div>
          </div>
        </div>

        {/* Select All / Clear */}
        <div className="pt-4 flex justify-between">
          <div>
            {selectedCount > 0 && (
              <Button variant="ghost" onClick={clearSelection} className="text-ods-text-secondary hover:text-ods-text-primary" noPadding>
                Clear Selection ({selectedCount})
              </Button>
            )}
          </div>
          <div>
            <Button
              onClick={selectAllDisplayed}
              variant="link"
              className="text-ods-accent hover:text-ods-accent-hover"
              noPadding
            >
              {isSmUp ? 'Select All Displayed Devices' :'Select All'}
            </Button>
          </div>
        </div>

        {/* Device Grid */}
        <div className="pt-2">
          {isLoadingDevices ? (
            <ListLoader />
          ) : devicesError ? (
            <LoadError message={`Failed to load devices: ${devicesError}`} />
          ) : devices.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
              <p className="text-ods-text-secondary">No devices found. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {devices.map((device) => {
                const id = device.machineId || device.agent_id || device.id
                const deviceType = device.type?.toLowerCase() as DeviceType
                const isSelected = selectedIds.has(id || '')
                return (
                  <SelectableDeviceCard
                    key={id}
                    title={device.displayName || device.hostname}
                    type={deviceType}
                    subtitle={getDeviceOperatingSystem(device.osType)}
                    selected={isSelected}
                    onSelect={() => toggleSelect(id || '')}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DetailPageContainer>
  )
}

export default ScheduleScriptView
