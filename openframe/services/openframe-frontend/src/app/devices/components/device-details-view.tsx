'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, StatusTag, ActionsMenu, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DetailPageContainer, RemoteControlIcon, ShellIcon, ScriptIcon } from '@flamingo/ui-kit'
import { normalizeOSType } from '@flamingo/ui-kit'
import { RemoteShellModal } from './remote-shell-modal'
import { useDeviceDetails } from '../hooks/use-device-details'
import { DeviceInfoSection } from './device-info-section'
import { CardLoader, LoadError, NotFoundError } from '@flamingo/ui-kit'
import { ScriptsModal } from './scripts-modal'
import { TabNavigation, TabContent, getTabComponent } from '@flamingo/ui-kit'
import { DEVICE_TABS } from './tabs/device-tabs'
import { getDeviceStatusConfig } from '../utils/device-status'
import { CmdIcon, PowerShellIcon } from '@flamingo/ui-kit/components/icons'
import { formatRelativeTime } from '@flamingo/ui-kit/utils/format-relative-time'

interface DeviceDetailsViewProps {
  deviceId: string
}

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter()

  const { deviceDetails, isLoading, error, fetchDeviceById, lastUpdated } = useDeviceDetails()

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false)
  const [isRemoteShellOpen, setIsRemoteShellOpen] = useState(false)
  const [shellType, setShellType] = useState<'cmd' | 'powershell'>('cmd')
  const [, forceUpdate] = useState({})

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  // Force re-render every second to update relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({})
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const normalizedDevice = deviceDetails

  const tacticalAgentId = normalizedDevice?.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId

  const meshcentralAgentId = normalizedDevice?.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId

  const handleBack = () => {
    router.push('/devices')
  }

  const handleRunScript = () => {
    setIsScriptsModalOpen(true)
  }

  const handleRunScripts = (scriptIds: string[]) => {
    console.log('Running scripts:', scriptIds, 'on device:', deviceId)
  }

  const handleRemoteControl = () => {
    if (!meshcentralAgentId) return
    const deviceData = {
      id: deviceId,
      meshcentralAgentId,
      hostname: normalizedDevice?.hostname,
      organization: normalizedDevice?.organization,
    }
    const url = `/devices/details/${deviceId}/remote-desktop?deviceData=${encodeURIComponent(JSON.stringify(deviceData))}`
    router.push(url)
  }

  const handleRemoteShell = (type: 'cmd' | 'powershell' = 'cmd') => {
    setShellType(type)
    setIsRemoteShellOpen(true)
  }

  const handleDeviceLogs = () => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', 'logs')
    // Add timestamp to force logs refresh
    params.set('refresh', Date.now().toString())
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const isWindows = useMemo(() => {
    const osType = normalizedDevice?.platform ||
      normalizedDevice?.osType ||
      normalizedDevice?.operating_system
    return normalizeOSType(osType) === 'WINDOWS'
  }, [normalizedDevice])

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading device: ${error}`} />
  }

  if (!normalizedDevice) {
    return <NotFoundError message="Device not found" />
  }

  const remoteShellMenuGroups = isWindows ? [{
    items: [
      {
        id: 'cmd',
        label: 'CMD',
        icon: <CmdIcon className="w-6 h-6" />,
        onClick: () => handleRemoteShell('cmd')
      },
      {
        id: 'powershell',
        label: 'PowerShell',
        icon: <PowerShellIcon className="w-6 h-6" />,
        onClick: () => handleRemoteShell('powershell')
      }
    ]
  }] : []

  const headerActions = (
    <>
      <Button
        onClick={handleRunScript}
        variant="device-action"
        leftIcon={<ScriptIcon className="h-6 w-6" />}
        disabled={!tacticalAgentId || deviceDetails?.status !== 'ONLINE'}
      >
        Run Script
      </Button>
      <Button
        onClick={handleRemoteControl}
        variant="device-action"
        leftIcon={<RemoteControlIcon className="h-6 w-6" />}
        disabled={!meshcentralAgentId || deviceDetails?.status !== 'ONLINE'}
      >
        Remote Control
      </Button>
      {isWindows ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="device-action"
              leftIcon={<ShellIcon className="h-6 w-6" />}
              disabled={!meshcentralAgentId || deviceDetails?.status !== 'ONLINE'}
            >
              Remote Shell
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-0 border-none">
            <ActionsMenu groups={remoteShellMenuGroups} />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={() => handleRemoteShell('cmd')}
          variant="device-action"
          leftIcon={<ShellIcon className="h-6 w-6" />}
          disabled={!meshcentralAgentId || deviceDetails?.status !== 'ONLINE'}
        >
          Remote Shell
        </Button>
      )}
    </>
  )

  return (
    <div className={`relative ${isRemoteShellOpen ? 'overflow-hidden' : ''}`}>
      <DetailPageContainer
        title={normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'}
        backButton={{
          label: 'Back to Devices',
          onClick: handleBack
        }}
        subtitle={
          <div className={`flex gap-3 items-center ${isRemoteShellOpen ? 'hidden' : ''}`}>
            {normalizedDevice?.status && (() => {
              const statusConfig = getDeviceStatusConfig(normalizedDevice.status)
              return (
                <StatusTag
                  label={statusConfig.label}
                  variant={statusConfig.variant}
                  className="px-2 py-1 text-[12px] leading-[16px]"
                />
              )
            })()}
            {lastUpdated && (
              <span className="text-ods-text-secondary text-xs">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
            )}
          </div>}
        headerActions={headerActions}
        padding='none'
        className='pt-6'
      >


        {/* Main Content */}
        <div className={`${isRemoteShellOpen ? 'invisible pointer-events-none' : 'flex-1 overflow-auto'}`}>
          <DeviceInfoSection device={normalizedDevice} />

          {/* Tab Navigation */}
          <div className="mt-6">
            <TabNavigation
              tabs={DEVICE_TABS}
              defaultTab="hardware"
              urlSync={true}
            >
              {(activeTab) => (
                <TabContent
                  activeTab={activeTab}
                  TabComponent={getTabComponent(DEVICE_TABS, activeTab)}
                  componentProps={{ device: normalizedDevice }}
                />
              )}
            </TabNavigation>
          </div>
        </div>

        {/* Scripts Modal */}
        <ScriptsModal
          isOpen={isScriptsModalOpen}
          onClose={() => setIsScriptsModalOpen(false)}
          deviceId={tacticalAgentId || deviceId}
          device={normalizedDevice}
          onRunScripts={handleRunScripts}
          onDeviceLogs={handleDeviceLogs}
        />
      </DetailPageContainer>

      <RemoteShellModal
        isOpen={isRemoteShellOpen}
        onClose={() => setIsRemoteShellOpen(false)}
        deviceId={meshcentralAgentId || deviceId}
        deviceLabel={normalizedDevice?.displayName || normalizedDevice?.hostname}
        shellType={shellType}
      />
    </div>
  )
}