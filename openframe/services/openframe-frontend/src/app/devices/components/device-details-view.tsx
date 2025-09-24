'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, RemoteControlIcon, ShellIcon } from '@flamingo/ui-kit'
import { RemoteShellModal } from './remote-shell-modal'
import { RemoteDesktopModal } from './remote-desktop-modal'
import { ScriptIcon, DetailPageContainer } from '@flamingo/ui-kit'
import { useDeviceDetails } from '../hooks/use-device-details'
import { DeviceInfoSection } from './device-info-section'
import { CardLoader, LoadError, NotFoundError } from '@flamingo/ui-kit'
import { DeviceStatusBadge } from './device-status-badge'
import { ScriptsModal } from './scripts-modal'
import {
  DeviceTabNavigation,
  DeviceTabContent
} from './tabs'

interface DeviceDetailsViewProps {
  deviceId: string
}

type TabId = 'hardware' | 'network' | 'security' | 'compliance' | 'agents' | 'users' | 'software' | 'vulnerabilities' | 'logs'

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('hardware')

  const { deviceDetails, isLoading, error, fetchDeviceById } = useDeviceDetails()

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false)
  const [isRemoteShellOpen, setIsRemoteShellOpen] = useState(false)
  const [isRemoteDesktopOpen, setIsRemoteDesktopOpen] = useState(false)

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  const normalizedDevice = deviceDetails

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
    setIsRemoteDesktopOpen(true)
  }

  const handleRemoteShell = () => {
    setIsRemoteShellOpen(true)
  }

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
      >
        Remote Control
      </Button>
      <Button
        onClick={handleRemoteShell}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<ShellIcon className="h-6 w-6" />}
      >
        Remote Shell
      </Button>
    </>
  )

  return (
    <div className={`relative ${isRemoteShellOpen || isRemoteDesktopOpen ? 'overflow-hidden' : ''}`}>
      <DetailPageContainer
        title={normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'}
        backButton={{
          label: 'Back to Devices',
          onClick: handleBack
        }}
        headerActions={headerActions}
      >
        {/* Status Badge */}
        <div className={`flex gap-2 items-center pl-6 ${isRemoteShellOpen || isRemoteDesktopOpen ? 'hidden' : ''}`}>
          <DeviceStatusBadge status={normalizedDevice?.status || 'unknown'} />
        </div>

        {/* Main Content */}
        <div className={`${isRemoteShellOpen || isRemoteDesktopOpen ? 'invisible pointer-events-none' : 'flex-1 overflow-auto'}`}>
          <DeviceInfoSection device={normalizedDevice} />

          {/* Tab Navigation */}
          <div className="mt-6">
            <DeviceTabNavigation
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as TabId)}
            />
          </div>

          {/* Tab Content */}
          <DeviceTabContent
            activeTab={activeTab}
            device={normalizedDevice}
          />
        </div>

        {/* Scripts Modal */}
        <ScriptsModal
          isOpen={isScriptsModalOpen}
          onClose={() => setIsScriptsModalOpen(false)}
          deviceId={deviceId}
          device={normalizedDevice}
          onRunScripts={handleRunScripts}
        />        
      </DetailPageContainer>

      <RemoteShellModal
        isOpen={isRemoteShellOpen}
        onClose={() => setIsRemoteShellOpen(false)}
        deviceId={meshcentralAgentId || deviceId}
        deviceLabel={normalizedDevice?.displayName || normalizedDevice?.hostname}
      />
      <RemoteDesktopModal
          isOpen={isRemoteDesktopOpen}
          onClose={() => setIsRemoteDesktopOpen(false)}
          deviceId={meshcentralAgentId || deviceId}
          deviceLabel={normalizedDevice?.displayName || normalizedDevice?.hostname}
        />
    </div>
  )
}