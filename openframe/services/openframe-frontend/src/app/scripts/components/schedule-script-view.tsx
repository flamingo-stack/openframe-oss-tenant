'use client'

import { DetailPageContainer, DeviceType, LoadError, NotFoundError, SelectCard } from '@flamingo-stack/openframe-frontend-core'
import { Button, Checkbox, Input, Label, ListLoader, SearchBar } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDeviceOperatingSystem } from '../../devices/utils/device-status'
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min'
import { useRunScriptData } from '../hooks/use-run-script-data'
import { ScriptInfoSection } from './script-info-section'

interface ScheduleScriptViewProps {
  scriptId: string
}

interface KeyValuePair {
  key: string
  value: string
}

function parseKeyValues(arr: string[] | undefined): KeyValuePair[] {
  if (!arr || arr.length === 0) return []
  return arr.map(item => {
    const idx = item.indexOf('=')
    if (idx === -1) return { key: item, value: '' }
    return { key: item.substring(0, idx), value: item.substring(idx + 1) }
  })
}

function serializeKeyValues(pairs: KeyValuePair[]): string[] {
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

  // Device search (client-side)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Organization search (client-side)
  const [orgSearchTerm, setOrgSearchTerm] = useState('')
  const { items: allOrganizations, fetch: fetchOrgs } = useOrganizationsMin()
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set())

  // Schedule form state
  const [timeout, setTimeout] = useState<number>(90)
  const [scriptArgs, setScriptArgs] = useState<KeyValuePair[]>([])
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([])
  const [note, setNote] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('16:00')
  const [repeatEnabled, setRepeatEnabled] = useState(false)

  // Initialize form from script details
  useEffect(() => {
    if (scriptDetails) {
      setTimeout(Number(scriptDetails.default_timeout) || 90)
      setScriptArgs(parseKeyValues(scriptDetails.args))
      setEnvVars(parseKeyValues(scriptDetails.env_vars))
    }
  }, [scriptDetails])

  // Load organizations once
  useEffect(() => {
    fetchOrgs('')
  }, [fetchOrgs])

  // Client-side filtered organizations
  const filteredOrganizations = useMemo(() => {
    if (!orgSearchTerm) return allOrganizations
    const term = orgSearchTerm.toLowerCase()
    return allOrganizations.filter(o => o.name.toLowerCase().includes(term))
  }, [allOrganizations, orgSearchTerm])

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
    if (selectedOrgIds.size > 0) {
      filtered = filtered.filter(d => d.organizationId && selectedOrgIds.has(d.organizationId))
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

  // Organization selection
  const toggleOrg = useCallback((id: string) => {
    setSelectedOrgIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Key-value pair handlers
  const addScriptArg = useCallback(() => {
    setScriptArgs(prev => [...prev, { key: '', value: '' }])
  }, [])

  const updateScriptArg = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setScriptArgs(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item))
  }, [])

  const removeScriptArg = useCallback((index: number) => {
    setScriptArgs(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addEnvVar = useCallback(() => {
    setEnvVars(prev => [...prev, { key: '', value: '' }])
  }, [])

  const updateEnvVar = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setEnvVars(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item))
  }, [])

  const removeEnvVar = useCallback((index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index))
  }, [])

  const selectedCount = selectedIds.size

  const handleSaveSchedule = useCallback(async () => {
    if (selectedCount === 0) {
      toast({ title: 'No devices selected', description: 'Please select at least one device.', variant: 'destructive' })
      return
    }
    if (!scheduleDate) {
      toast({ title: 'Date required', description: 'Please select a schedule date.', variant: 'destructive' })
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

      const runTimeDate = `${scheduleDate}T${scheduleTime || '00:00'}Z`

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
          timeout,
          script_args: serializeKeyValues(scriptArgs),
          env_vars: serializeKeyValues(envVars),
          run_as_user: Boolean(scriptDetails?.run_as_user),
        }],
        name: note || scriptDetails?.name || 'Scheduled Script',
        task_type: repeatEnabled ? 'daily' as const : 'runonce' as const,
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

      const results = await Promise.allSettled(
        selectedAgentIds.map(agentId =>
          tacticalApiClient.createScheduledTask(agentId, taskData)
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value.ok).length
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
  }, [selectedCount, devices, selectedIds, scriptDetails, scheduleDate, scheduleTime, note, scriptArgs, envVars, timeout, repeatEnabled, toast, router, scriptId])

  const actions = useMemo(() => [
    {
      label: 'Save Schedule',
      icon: <Calendar size={20} />,
      onClick: handleSaveSchedule,
      variant: 'primary' as const,
      disabled: selectedCount === 0,
    }
  ], [handleSaveSchedule, selectedCount])

  if (isLoadingScript) {
    return <ListLoader />
  }

  if (scriptError) {
    return <LoadError message={`Error loading script: ${scriptError}`} />
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />
  }

  const selectedOrgs = filteredOrganizations.filter(o => selectedOrgIds.has(o.id))
  const visibleOrgTags = selectedOrgs.slice(0, 5)

  return (
    <DetailPageContainer
      title="Schedule Script"
      backButton={{ label: 'Back to Script Details', onClick: handleBack }}
      actions={actions}
    >
      <div className="flex-1 overflow-auto">
        <ScriptInfoSection script={scriptDetails} />

        {/* Timeout */}
        <div className="pt-6">
          <Label className="text-ods-text-primary font-semibold text-base">Timeout</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value) || 0)}
              className="w-[140px] bg-ods-card border border-ods-border"
            />
            <span className="text-ods-text-secondary text-sm">Seconds</span>
          </div>
        </div>

        {/* Script Arguments & Environment Vars */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Script Arguments */}
          <div>
            <Label className="text-ods-text-primary font-semibold text-base">Script Arguments</Label>
            <div className="flex flex-col gap-2 mt-2">
              {scriptArgs.map((arg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Key"
                    value={arg.key}
                    onChange={(e) => updateScriptArg(i, 'key', e.target.value)}
                    className="flex-1 bg-ods-card border border-ods-border"
                  />
                  <Input
                    placeholder="Enter Value (empty=flag)"
                    value={arg.value}
                    onChange={(e) => updateScriptArg(i, 'value', e.target.value)}
                    className="flex-1 bg-ods-card border border-ods-border"
                  />
                  <button
                    onClick={() => removeScriptArg(i)}
                    className="p-2 text-red-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addScriptArg}
              className="flex items-center gap-2 mt-3 text-ods-text-primary hover:text-ods-accent transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Script Argument
            </button>
          </div>

          {/* Environment Variables */}
          <div>
            <Label className="text-ods-text-primary font-semibold text-base">Environment Vars</Label>
            <div className="flex flex-col gap-2 mt-2">
              {envVars.map((ev, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Key"
                    value={ev.key}
                    onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                    className="flex-1 bg-ods-card border border-ods-border"
                  />
                  <Input
                    placeholder="Enter Value"
                    value={ev.value}
                    onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                    className="flex-1 bg-ods-card border border-ods-border"
                  />
                  <button
                    onClick={() => removeEnvVar(i)}
                    className="p-2 text-red-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addEnvVar}
              className="flex items-center gap-2 mt-3 text-ods-text-primary hover:text-ods-accent transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Environment Var
            </button>
          </div>
        </div>

        {/* Note, Date/Time, Repeat */}
        <div className="pt-6">
          <Label className="text-ods-text-primary font-semibold text-base">Note</Label>
          <div className="flex flex-wrap items-end gap-4 mt-2">
            <Input
              placeholder="Enter Note Here"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-[240px] bg-ods-card border border-ods-border"
            />
            <Input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-[160px] bg-ods-card border border-ods-border"
            />
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-[140px] bg-ods-card border border-ods-border"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={repeatEnabled}
                onCheckedChange={(c) => setRepeatEnabled(Boolean(c))}
              />
              <span className="text-ods-text-primary text-sm">Repeat Script Run</span>
            </label>
          </div>
        </div>

        {/* Search by Device & Organization */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <div className="text-ods-text-primary font-semibold text-lg">Search by Device</div>
            <div className="w-full">
              <SearchBar
                placeholder="Search for Devices"
                value={searchTerm}
                onSubmit={setSearchTerm}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-ods-text-primary font-semibold text-lg">Search by Organization</div>
            <div className="w-full">
              <SearchBar
                placeholder="Search for Organization"
                value={orgSearchTerm}
                onSubmit={setOrgSearchTerm}
              />
            </div>
            {filteredOrganizations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filteredOrganizations.slice(0, 5).map(org => (
                  <button
                    key={org.id}
                    onClick={() => toggleOrg(org.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      selectedOrgIds.has(org.id)
                        ? 'bg-ods-accent text-white'
                        : 'bg-ods-card border border-ods-border text-ods-text-primary hover:bg-ods-accent/20'
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
                {filteredOrganizations.length > 5 && (
                  <span className="text-ods-text-secondary text-xs self-center">Show All</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Select All / Clear */}
        <div className="pt-4 flex items-center justify-between">
          <div>
            {selectedCount > 0 && (
              <Button variant="ghost" onClick={clearSelection} className="text-ods-text-secondary hover:text-ods-text-primary">
                Clear Selection ({selectedCount})
              </Button>
            )}
          </div>
          <Button
            onClick={selectAllDisplayed}
            variant="ghost"
            className="text-ods-accent hover:text-ods-accent-hover"
          >
            Select All Displayed Devices
          </Button>
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
                  <SelectCard
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
