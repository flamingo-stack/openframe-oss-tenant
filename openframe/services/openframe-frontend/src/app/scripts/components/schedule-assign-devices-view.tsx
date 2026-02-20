'use client'

import {
  DetailPageContainer,
  DeviceType,
  getDeviceTypeIcon,
  getOSPlatformId,
  LoadError,
  NotFoundError,
} from '@flamingo-stack/openframe-frontend-core'
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils'
import { OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features'
import { CheckCircleIcon, MonitorIcon, PlusCircleIcon, SearchIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { Button, getTabComponent, Input, Table, TabContent, TabNavigation, type TableColumn, type TabItem } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { DEVICE_STATUS } from '../../devices/constants/device-statuses'
import { GET_DEVICES_QUERY } from '../../devices/queries/devices-queries'
import type { Device, DevicesGraphQLNode, GraphQLResponse } from '../../devices/types/device.types'
import { createDeviceListItem } from '../../devices/utils/device-transform'
import { useScriptSchedule, useScriptScheduleAgents } from '../hooks/use-script-schedule'
import { useReplaceScheduleAgents } from '../hooks/use-script-schedule-mutations'
import { formatScheduleDate, getRepeatLabel } from '../types/script-schedule.types'
import { ScheduleAssignDevicesLoader } from './schedule-assign-devices-loader'
import { ScheduleInfoBarFromData } from './schedule-info-bar'

interface ScheduleAssignDevicesViewProps {
  scheduleId: string
}

async function fetchDevicesByPlatforms(platforms: string[]): Promise<Device[]> {
  const filter = {
    statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
    // ...(osTypes.length > 0 && { osTypes }),
    // TODO: remove after macos/linux support
    osTypes: ['WINDOWS']
  }

  const response = await apiClient.post<
    GraphQLResponse<{
      devices: {
        edges: Array<{ node: DevicesGraphQLNode; cursor: string }>
        pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean }
        filteredCount: number
      }
    }>
  >('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: {
      filter,
      pagination: { limit: 100, cursor: null },
      search: '',
    },
  })

  if (!response.ok) {
    throw new Error(response.error || 'Failed to fetch devices')
  }

  const graphqlResponse = response.data
  if (!graphqlResponse?.data) {
    throw new Error('No data received from server')
  }

  const nodes = graphqlResponse.data.devices.edges.map((e) => e.node)
  const devices = nodes.map(createDeviceListItem)

  if (platforms.length === 0) return devices

  return devices.filter((d) => {
    const platformId = getOSPlatformId(d.osType)
    return platformId ? platforms.includes(platformId) : false
  })
}

type SubTab = 'available' | 'selected'

interface DeviceTabContentProps {
  mode: SubTab
  devices: Device[]
  columns: TableColumn<Device>[]
  loading: boolean
  renderRowActions: (device: Device) => React.ReactNode
  onAddAll: () => void
  onRemoveAll: () => void
  selectedCount: number
}

function DeviceTabContent({ mode, devices, columns, loading, renderRowActions, onAddAll, onRemoveAll, selectedCount }: DeviceTabContentProps) {
  return (
    <>
      <div className="flex justify-end -mb-2">
        {mode === 'available' ? (
          <Button variant="link" onClick={onAddAll} className="font-medium text-[14px] text-[var(--open-colors-yellow,#ffc008)] hover:text-[var(--open-colors-yellow-hover,#e6ac00)]">
            Add All Devices
          </Button>
        ) : selectedCount > 0 ? (
          <Button variant="link" onClick={onRemoveAll} className="font-medium text-[14px] text-[var(--ods-attention-red-error,#d32f2f)] hover:text-[var(--ods-attention-red-error-hover,#b71c1c)]">
            Remove {selectedCount} Devices
          </Button>
        ) : null}
      </div>
      <Table
        data={devices}
        columns={columns}
        rowKey="tacticalAgentId"
        loading={loading}
        skeletonRows={8}
        emptyMessage={mode === 'selected' ? 'No devices selected' : 'No devices found'}
        showFilters={false}
        renderRowActions={renderRowActions}
      />
    </>
  )
}

export function ScheduleAssignDevicesView({ scheduleId }: ScheduleAssignDevicesViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { schedule, isLoading: isLoadingSchedule, error: scheduleError } = useScriptSchedule(scheduleId)
  const { agents: currentAgents, isLoading: isLoadingAgents } = useScriptScheduleAgents(scheduleId)
  const replaceAgentsMutation = useReplaceScheduleAgents()

  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('available')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize selected agents from current assignment
  if (!isInitialized && !isLoadingAgents && currentAgents.length > 0) {
    const ids = new Set(currentAgents.map((a) => a.agent_id))
    setSelectedAgentIds(ids)
    setIsInitialized(true)
  }
  if (!isInitialized && !isLoadingAgents && currentAgents.length === 0) {
    setIsInitialized(true)
  }

  const supportedPlatforms = schedule?.task_supported_platforms ?? []

  const devicesQuery = useQuery({
    queryKey: ['schedule-assign-devices', scheduleId, supportedPlatforms],
    queryFn: () => fetchDevicesByPlatforms(supportedPlatforms),
    enabled: Boolean(scheduleId) && Boolean(schedule),
  })

  // Only include devices that have a Tactical RMM agent_id
  const allDevices = useMemo(() => {
    return (devicesQuery.data ?? []).filter((d) => !!d.tacticalAgentId)
  }, [devicesQuery.data])

  const filteredDevices = useMemo(() => {
    let devices = allDevices
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      devices = devices.filter(
        (d) =>
          (d.displayName || d.hostname || '').toLowerCase().includes(lowerSearch) ||
          (d.osType || d.operating_system || '').toLowerCase().includes(lowerSearch),
      )
    }
    return devices
  }, [allDevices, searchTerm])

  const displayDevices = useMemo(() => {
    if (activeSubTab === 'selected') {
      return filteredDevices.filter((d) => selectedAgentIds.has(d.tacticalAgentId!))
    }
    return filteredDevices
  }, [filteredDevices, activeSubTab, selectedAgentIds])

  const toggleDevice = useCallback((deviceId: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }, [])

  const addAllDevices = useCallback(() => {
    const ids = filteredDevices.map((d) => d.tacticalAgentId!)
    setSelectedAgentIds(new Set(ids))
  }, [filteredDevices])

  const handleBack = useCallback(() => {
    router.push(`/scripts/schedules/${scheduleId}`)
  }, [router, scheduleId])

  const handleSave = useCallback(async () => {
    try {
      await replaceAgentsMutation.mutateAsync({
        id: scheduleId,
        agents: Array.from(selectedAgentIds),
      })
      toast({
        title: 'Devices saved',
        description: `${selectedAgentIds.size} device(s) assigned to schedule.`,
        variant: 'success',
      })
      router.push(`/scripts/schedules/${scheduleId}?tab=schedule-devices`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save devices'
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    }
  }, [replaceAgentsMutation, scheduleId, selectedAgentIds, toast, router])

  const actions = useMemo(
    () => [
      {
        label: 'Cancel',
        onClick: handleBack,
        variant: 'outline' as const,
        showOnlyMobile: true,
      },
      {
        label: 'Save Devices',
        onClick: handleSave,
        variant: 'primary' as const,
        loading: replaceAgentsMutation.isPending,
      },
    ],
    [handleSave, replaceAgentsMutation.isPending],
  )

  const columns: TableColumn<Device>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        renderCell: (device) => {
          const lastSeen = device.last_seen || device.lastSeen
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded-[6px] border border-ods-border">
                {device.type && getDeviceTypeIcon(device.type.toLowerCase() as DeviceType, { className: 'w-5 h-5 text-ods-text-secondary' })}
              </div>
              <div className="flex flex-col truncate">
                <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
                  {device.displayName || device.hostname}
                </span>
                <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                  Last Online: {lastSeen ? formatRelativeTime(lastSeen) : 'unknown'}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        key: 'details',
        label: 'DETAILS',
        width: 'w-[100px] md:flex-1',
        renderCell: (device) => {
          return (
            <OSTypeBadge osType={device.osType} />
          )
        },
      },
    ],
    [],
  )

  const removeAllSelected = useCallback(() => {
    setSelectedAgentIds(new Set())
  }, [])

  const renderRowActions = useMemo(
    () => (device: Device) => {
      const agentId = device.tacticalAgentId!
      const isSelected = selectedAgentIds.has(agentId)

      if (activeSubTab === 'selected') {
        return (
          <Button
            variant="device-action"
            size="icon"
            onClick={() => toggleDevice(agentId)}
            centerIcon={<TrashIcon size={24} />}
            className="text-[var(--ods-attention-red-error,#d32f2f)] hover:opacity-80"
          />
        )
      }

      return (
        <Button
          variant="device-action"
          size="icon"
          onClick={() => toggleDevice(agentId)}
          centerIcon={isSelected ? <CheckCircleIcon size={24} /> : <PlusCircleIcon size={24} />}
          className={isSelected
            ? 'text-[var(--open-colors-yellow,#ffc008)] border-[var(--open-colors-yellow,#ffc008)] bg-[#7F6004] hover:bg-[#7F6004]'
            : 'text-ods-text-secondary hover:text-ods-text-primary'
          }
        />
      )
    },
    [selectedAgentIds, toggleDevice, activeSubTab],
  )

  const assignTabs: TabItem[] = useMemo(() => [
    { id: 'available', label: 'Available Devices', icon: MonitorIcon, component: DeviceTabContent },
    { id: 'selected', label: `Selected Devices (${selectedAgentIds.size})`, icon: CheckCircleIcon, component: DeviceTabContent },
  ], [selectedAgentIds.size])

  const ActiveTabComponent = getTabComponent(assignTabs, activeSubTab)

  if (isLoadingSchedule) {
    return <ScheduleAssignDevicesLoader />
  }

  if (scheduleError) {
    return <LoadError message={`Error loading schedule: ${scheduleError}`} />
  }

  if (!schedule) {
    return <NotFoundError message="Schedule not found" />
  }

  const { date, time } = formatScheduleDate(schedule.run_time_date)
  const repeat = getRepeatLabel(schedule)

  return (
    <DetailPageContainer
      title="Schedule Devices"
      backButton={{ label: 'Back to Schedule', onClick: handleBack }}
      actions={actions}
    >
      <div className="flex flex-col gap-6 overflow-auto">
        {/* Schedule summary */}
        <ScheduleInfoBarFromData
          name={schedule.name}
          note=""
          date={date}
          time={time}
          repeat={repeat}
          platforms={schedule.task_supported_platforms}
        />

        {/* Selection mode radio */}
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-[var(--open-colors-yellow,#ffc008)] rounded-[6px] cursor-pointer">
            <input type="radio" name="selectionMode" value="specific" defaultChecked className="mt-1 accent-[var(--open-colors-yellow,#ffc008)]" />
            <div className="flex flex-col">
              <span className="font-medium text-[18px] text-ods-text-primary">Select Specific Devices</span>
              <span className="text-[14px] text-ods-text-secondary">
                Choose individual devices to include in this script schedule
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-ods-border rounded-[6px] opacity-50 cursor-not-allowed">
            <input type="radio" name="selectionMode" value="criteria" disabled className="mt-1" />
            <div className="flex flex-col flex-1">
              <span className="font-medium text-[18px] text-ods-text-primary">Select Devices by Criteria</span>
              <span className="text-[14px] text-ods-text-secondary">
                Automatically include all devices (current and future) that match your defined criteria
              </span>
            </div>
            <span className="font-['Azeret_Mono'] font-medium text-[12px] px-3 py-1 bg-ods-card border border-ods-border rounded-[4px] text-ods-text-secondary uppercase tracking-wider">
              Coming Soon
            </span>
          </label>
        </div>

        <TabNavigation
          tabs={assignTabs}
          activeTab={activeSubTab}
          onTabChange={(tabId) => {
            setSearchTerm('')
            setActiveSubTab(tabId as SubTab)
          }}
        />

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              startAdornment={<SearchIcon size={20} />}
              placeholder="Search for Devices"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <TabContent
          activeTab={activeSubTab}
          TabComponent={ActiveTabComponent}
          componentProps={{
            mode: activeSubTab,
            devices: displayDevices,
            columns,
            loading: devicesQuery.isLoading,
            renderRowActions,
            onAddAll: addAllDevices,
            onRemoveAll: removeAllSelected,
            selectedCount: selectedAgentIds.size,
          }}
        />
      </div>
    </DetailPageContainer>
  )
}
