'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button, RemoteControlIcon, ShellIcon } from '@flamingo/ui-kit'
import { ScriptIcon } from '@flamingo/ui-kit'
import { useDeviceDetails } from '../hooks/use-device-details'
import { DeviceInfoSection } from './device-info-section'
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
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-[#3a3a3a] rounded mb-6" />
          <div className="bg-[#212121] border border-[#3a3a3a] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-[#3a3a3a] rounded mb-2" />
                  <div className="h-6 w-32 bg-[#3a3a3a] rounded" />
                </div>
              ))}
            </div>
            <div className="border-t border-[#3a3a3a] pt-4">
              <div className="h-4 w-64 bg-[#3a3a3a] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400">Error loading device: {error}</p>
        </div>
      </div>
    )
  }

  if (!normalizedDevice) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400">Device not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex items-end justify-between gap-4 pl-6 pr-6">
        <div className="flex flex-col gap-2 flex-1">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-3 rounded-[6px] hover:bg-[#2a2a2a] transition-colors self-start"
          >
            <ChevronLeft className="h-6 w-6 text-[#888888]" />
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#888888]">
              Back to Devices
            </span>
          </button>

          {/* Device Name */}
          <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-[#fafafa]">
            {normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <Button
            onClick={handleRunScript}
            leftIcon={<ScriptIcon size={24} />}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            Run Script
          </Button>
          <Button
            onClick={handleRemoteControl}
            leftIcon={<RemoteControlIcon size={24} />}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            Remote Control
          </Button>
          <Button
            onClick={handleRemoteShell}
            leftIcon={<ShellIcon size={24} />}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >
            Remote Shell
          </Button>
        </div>
      </div>

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
    </div>
  )
}