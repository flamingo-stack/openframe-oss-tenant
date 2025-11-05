'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, RemoteControlIcon, ShellIcon, StatusTag } from '@flamingo/ui-kit'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@flamingo/ui-kit/components/ui'
import { CmdIcon, PowerShellIcon } from '@flamingo/ui-kit/components/icons'
import { normalizeOSType } from '@flamingo/ui-kit'
import { RemoteShellModal } from './remote-shell-modal'
import { ScriptIcon, DetailPageContainer } from '@flamingo/ui-kit'
import { useDeviceDetails } from '../hooks/use-device-details'
import { DeviceInfoSection } from './device-info-section'
import { CardLoader, LoadError, NotFoundError } from '@flamingo/ui-kit'
import { ScriptsModal } from './scripts-modal'
import { TabNavigation, TabContent, getTabComponent } from '@flamingo/ui-kit'
import { DEVICE_TABS } from './tabs/device-tabs'
import { getDeviceStatusConfig } from '../utils/device-status'

interface DeviceDetailsViewProps {
  deviceId: string
}

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter()

  const { deviceDetails, isLoading, error, fetchDeviceById } = useDeviceDetails()

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false)
  const [isRemoteShellOpen, setIsRemoteShellOpen] = useState(false)
  const [shellType, setShellType] = useState<'cmd' | 'powershell'>('cmd')

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  const normalizedDevice = deviceDetails

  const tacticalAgentId = normalizedDevice?.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId
    || normalizedDevice?.agent_id

  const meshcentralAgentId = normalizedDevice?.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId
    || normalizedDevice?.agent_id

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

  const headerActions = (
    <>
      <Button
        onClick={handleRunScript}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<ScriptIcon className="h-6 w-6" />}
      >
        Run Script
      </Button>
      <Button
        onClick={handleRemoteControl}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<RemoteControlIcon className="h-6 w-6" />}
        disabled={!meshcentralAgentId}
      >
        Remote Control
      </Button>
      {isWindows ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              leftIcon={<ShellIcon className="h-6 w-6" />}
              className="bg-ods-card focus-visible:ring-0"
              disabled={!meshcentralAgentId}
            >
              Remote Shell
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-ods-card border-ods-border">
            <DropdownMenuItem 
              onClick={() => handleRemoteShell('cmd')}
              className="text-ods-text-primary focus:bg-ods-accent cursor-pointer"
            >
              <CmdIcon className="h-5 w-5 mr-2" />
              CMD
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRemoteShell('powershell')}
              className="text-ods-text-primary focus:bg-ods-accent cursor-pointer"
            >
              <PowerShellIcon className="h-5 w-5 mr-2" />
              PowerShell
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={() => handleRemoteShell('cmd')}
          variant="outline"
          className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          leftIcon={<ShellIcon className="h-6 w-6" />}
          disabled={!meshcentralAgentId}
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
          <div className={`flex gap-2 items-center ${isRemoteShellOpen ? 'hidden' : ''}`}>
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