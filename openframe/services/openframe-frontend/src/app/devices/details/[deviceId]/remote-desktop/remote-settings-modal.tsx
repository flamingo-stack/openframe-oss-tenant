'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Label
} from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { MeshDesktop } from '@lib/meshcentral/meshcentral-desktop'
import { MeshTunnel } from '@lib/meshcentral/meshcentral-tunnel'
import {
  RemoteSettingsConfig,
  QUALITY_OPTIONS,
  SCALING_OPTIONS,
  FRAME_RATE_OPTIONS,
  RemoteDesktopSettings
} from '@lib/meshcentral/remote-settings'

interface RemoteSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSettings: RemoteSettingsConfig
  desktopRef: React.MutableRefObject<MeshDesktop | null>
  tunnelRef: React.MutableRefObject<MeshTunnel | null>
  connectionState: number
  onSettingsChange?: (settings: RemoteSettingsConfig) => void
}

export function RemoteSettingsModal({
  open,
  onOpenChange,
  currentSettings,
  desktopRef,
  tunnelRef,
  connectionState,
  onSettingsChange
}: RemoteSettingsModalProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<RemoteSettingsConfig>(currentSettings)

  useEffect(() => {
    setSettings(currentSettings)
  }, [currentSettings])

  const handleSaveSettings = () => {
    if (!tunnelRef.current || connectionState !== 3) {
      toast({
        title: 'Connection Required',
        description: 'Please wait for the remote desktop connection to establish',
        variant: 'destructive'
      })
      return
    }

    try {
      const settingsManager = new RemoteDesktopSettings(settings)
      settingsManager.setWebSocket(tunnelRef.current)
      settingsManager.applySettings(settings)

      if (desktopRef.current) {
        desktopRef.current.setSwapMouseButtons?.(settings.swapMouseButtons)
        desktopRef.current.setUseRemoteKeyboardMap?.(settings.useRemoteKeyboardMap)
      }

      onSettingsChange?.(settings)

      toast({
        title: 'Settings Applied',
        description: `Remote control settings updated. Est. bandwidth: ${settingsManager.estimateBandwidth()} KB/s`,
        variant: 'success',
        duration: 3000
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Settings Failed',
        description: 'Unable to apply remote control settings',
        variant: 'destructive'
      })
    }
  }

  const handleClose = () => {
    setSettings(currentSettings)
    onOpenChange(false)
  }

  return (
    <Modal isOpen={open} onClose={handleClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Remote Control Settings</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">
          Configure quality, scaling, and keyboard preferences
        </p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Quality and Scaling Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quality Selector */}
          <div className="space-y-2">
            <Label htmlFor="quality">Quality</Label>
            <Select
              value={String(settings.quality)}
              onValueChange={(value) => setSettings({ ...settings, quality: Number(value) })}
            >
              <SelectTrigger id="quality" className="bg-ods-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scaling Selector */}
          <div className="space-y-2">
            <Label htmlFor="scaling">Scaling</Label>
            <Select
              value={String(settings.scaling)}
              onValueChange={(value) => setSettings({ ...settings, scaling: Number(value) })}
            >
              <SelectTrigger id="scaling" className="bg-ods-card">
                <SelectValue>
                  {SCALING_OPTIONS.find(opt => opt.value === settings.scaling)?.label || '100%'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SCALING_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Frame Rate */}
        <div className="space-y-2">
          <Label htmlFor="framerate">Frame Rate</Label>
          <Select
            value={settings.frameRate}
            onValueChange={(value: any) => setSettings({ ...settings, frameRate: value })}
          >
            <SelectTrigger id="framerate" className="bg-ods-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRAME_RATE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-4 bg-ods-card border border-ods-border rounded-lg">
            <Checkbox
              id="swap-mouse"
              checked={settings.swapMouseButtons}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, swapMouseButtons: !!checked })
              }
            />
            <div className="flex-1">
              <Label htmlFor="swap-mouse" className="cursor-pointer">
                Swap Mouse Buttons
              </Label>
              <p className="text-sm text-ods-text-secondary">Reverse left and right mouse button functions</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-ods-card border border-ods-border rounded-lg">
            <Checkbox
              id="keyboard-map"
              checked={settings.useRemoteKeyboardMap}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, useRemoteKeyboardMap: !!checked })
              }
            />
            <div className="flex-1">
              <Label htmlFor="keyboard-map" className="cursor-pointer">
                Use Remote Keyboard Map
              </Label>
              <p className="text-sm text-ods-text-secondary">Use the remote device's keyboard layout</p>
            </div>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </ModalFooter>
    </Modal>
  )
}