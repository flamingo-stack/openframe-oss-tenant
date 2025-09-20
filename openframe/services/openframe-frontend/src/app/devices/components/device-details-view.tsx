'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button, RemoteControlIcon, ShellIcon } from '@flamingo/ui-kit'
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

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  const normalizedDevice = deviceDetails

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
    console.log('Remote control clicked for device:', deviceId)
  }

  const handleRemoteShell = () => {
    console.log('Remote shell clicked for device:', deviceId)
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
        variant="primary"
        className="bg-ods-accent hover:bg-ods-accent-hover text-ods-text-on-accent px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<ScriptIcon className="h-6 w-6" />}
      >
        Run Script
      </Button>
      <Button
        onClick={handleRemoteShell}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<ShellIcon className="h-6 w-6" />}
      >
        Remote Shell
      </Button>
      <Button
        onClick={handleRemoteControl}
        variant="outline"
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
        leftIcon={<RemoteControlIcon className="h-6 w-6" />}
      >
        Remote Control
      </Button>
    </>
  )

  return (
    <DetailPageContainer
      title={normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'}
      backButton={{
        label: 'Back to Devices',
        onClick: handleBack
      }}
      headerActions={headerActions}
    >

      {/* Status Badge */}
      <div className="flex gap-2 items-center pl-6">
        <DeviceStatusBadge status={normalizedDevice?.status || 'unknown'} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
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
  )
}