'use client'

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ListLoader } from '@flamingo/ui-kit/components/ui'
import { DetailPageContainer, SelectCard, LoadError, NotFoundError } from '@flamingo/ui-kit'
import { SearchBar } from '@flamingo/ui-kit/components/ui'
import { useToast, useDebounce } from '@flamingo/ui-kit/hooks'
import { ScriptInfoSection } from './script-info-section'
import { useScriptDetails } from '../hooks/use-script-details'
import { useDevices } from '../../devices/hooks/use-devices'
import { getDeviceOperatingSystem } from '../../devices/utils/device-status'
import { DeviceType } from '@flamingo/ui-kit'
import { tacticalApiClient } from '@lib/tactical-api-client'

interface RunScriptViewProps {
  scriptId: string
}

export function RunScriptView({ scriptId }: RunScriptViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  const { scriptDetails, isLoading: isLoadingScript, error: scriptError } = useScriptDetails(scriptId)

  const { devices, isLoading: isLoadingDevices, error: devicesError, searchDevices, fetchDevices } = useDevices({})

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      searchDevices(debouncedSearch)
    }
  }, [debouncedSearch, searchDevices])

  const handleBack = useCallback(() => {
    router.push(`/scripts/details/${scriptId}`)
  }, [router, scriptId])

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

  const headerActions = (
    <>
      <Button
        onClick={async () => {
          if (selectedCount === 0) return
          try {
            const selectedDevices = devices.filter(d => selectedIds.has((d.machineId || d.agent_id || d.id) || ''))
            const selectedAgentIds = selectedDevices
              .map(d => d.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId)
              .filter((id): id is string => !!id)

            if (selectedAgentIds.length === 0) {
              toast({ title: 'No compatible agents', description: 'Selected devices have no Tactical agent IDs.', variant: 'destructive' })
              return
            }

            const normalizeOs = (os?: string) => {
              const o = (os || '').toLowerCase()
              if (o.includes('win')) return 'windows'
              if (o.includes('mac') || o.includes('darwin') || o.includes('osx')) return 'darwin'
              if (o.includes('linux') || o.includes('ubuntu') || o.includes('debian') || o.includes('centos') || o.includes('redhat')) return 'linux'
              return null
            }
            const osTypesSet = new Set(
              selectedDevices
                .map(d => normalizeOs(d.osType || d.operating_system))
                .filter((v): v is 'windows' | 'linux' | 'darwin' => v !== null)
            )
            const osType = osTypesSet.size === 1 ? Array.from(osTypesSet)[0] : 'all'

            const shell = osType === 'windows'
              ? (scriptDetails?.shell === 'powershell' ? 'powershell' : 'cmd')
              : '/bin/bash'
            const payload = {
              mode: 'script',
              target: 'agents',
              monType: 'all',
              osType,
              cmd: '',
              shell,
              custom_shell: null,
              custom_field: null,
              collector_all_output: false,
              save_to_agent_note: false,
              patchMode: 'scan',
              offlineAgents: false,
              client: null,
              site: null,
              agents: selectedAgentIds,
              script: Number(scriptDetails?.id),
              timeout: Number(scriptDetails?.default_timeout || 90),
              args: scriptDetails?.args || [],
              env_vars: scriptDetails?.env_vars || [],
              run_as_user: Boolean(scriptDetails?.run_as_user) || false,
            }

            const res = await tacticalApiClient.runBulkAction(payload)
            if (!res.ok) {
              throw new Error(res.error || `Bulk action failed with status ${res.status}`)
            }

            toast({ title: 'Scripts submitted', description: `${selectedAgentIds.length} agent(s) received the script.`, variant: 'success' })
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to submit script'
            toast({ title: 'Submission failed', description: msg, variant: 'destructive' })
          }
        }}
        disabled={selectedCount === 0}
        className="bg-ods-accent hover:bg-ods-accent-hover text-ods-text-on-accent px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px]"
      >
        Run Script
      </Button>
    </>
  )

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
      title="Run Script"
      backButton={{ label: 'Back to Script Details', onClick: handleBack }}
      headerActions={headerActions}
    >
      {/* Script summary */}
      <div className="flex-1 overflow-auto">
        <ScriptInfoSection script={scriptDetails} />

        {/* Device selection */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div className="text-ods-text-primary font-semibold text-lg">Search by Device</div>
            <div className="w-full md:w-[380px]">
              <SearchBar
                placeholder="Search for Devices"
                value={searchTerm}
                onSubmit={setSearchTerm}
              />
            </div>
          </div>
          <div className="flex items-end md:justify-end">
            <Button
              onClick={selectAllDisplayed}
              variant="ghost"
              className="text-ods-accent hover:text-ods-accent-hover"
            >
              Select All Displayed Devices
            </Button>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            {selectedCount > 0 && (
              <Button variant="ghost" onClick={clearSelection} className="text-ods-text-secondary hover:text-ods-text-primary">
                Clear Selection
              </Button>
            )}
          </div>

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

export default RunScriptView
