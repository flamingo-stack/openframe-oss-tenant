'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Label
} from '@flamingo/ui-kit'
import { useToast } from '@flamingo/ui-kit/hooks'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-ods-card border-ods-border p-10">
        <DialogHeader>
          <DialogTitle className="text-3xl font-semibold text-ods-text-primary">
            Remote Control Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Quality and Scaling Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Quality Selector */}
            <div className="space-y-2">
              <Label htmlFor="quality" className="text-lg text-ods-text-primary">
                Quality
              </Label>
              <Select 
                value={String(settings.quality)} 
                onValueChange={(value) => setSettings({ ...settings, quality: Number(value) })}
              >
                <SelectTrigger 
                  id="quality"
                  className="bg-ods-system-greys-black border-ods-border text-ods-text-primary h-14"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ods-card border-ods-border">
                  {QUALITY_OPTIONS.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={String(option.value)}
                      className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scaling Selector */}
            <div className="space-y-2">
              <Label htmlFor="scaling" className="text-lg text-ods-text-primary">
                Scaling
              </Label>
              <Select 
                value={String(settings.scaling)} 
                onValueChange={(value) => setSettings({ ...settings, scaling: Number(value) })}
              >
                <SelectTrigger 
                  id="scaling"
                  className="bg-ods-system-greys-black border-ods-border text-ods-text-primary h-14"
                >
                  <SelectValue>
                    {SCALING_OPTIONS.find(opt => opt.value === settings.scaling)?.label || '100%'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-ods-card border-ods-border">
                  {SCALING_OPTIONS.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={String(option.value)}
                      className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frame Rate Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Frame Rate Selector */}
            <div className="space-y-2">
              <Label htmlFor="framerate" className="text-lg text-ods-text-primary">
                Frame Rate
              </Label>
              <Select 
                value={settings.frameRate} 
                onValueChange={(value: any) => setSettings({ ...settings, frameRate: value })}
              >
                <SelectTrigger 
                  id="framerate"
                  className="bg-ods-system-greys-black border-ods-border text-ods-text-primary h-14"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ods-card border-ods-border">
                  {FRAME_RATE_OPTIONS.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
          </div>

          {/* Checkbox Options */}
          <div className="border border-ods-border rounded-md bg-ods-system-greys-black">
            {/* Swap Mouse Buttons */}
            <div className="flex items-center gap-3 p-4 border-b border-ods-border">
              <Checkbox
                id="swap-mouse"
                checked={settings.swapMouseButtons}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, swapMouseButtons: !!checked })
                }
                className="h-6 w-6 border-2 border-ods-border data-[state=checked]:bg-ods-accent data-[state=checked]:border-ods-accent"
              />
              <Label 
                htmlFor="swap-mouse" 
                className="text-lg text-ods-text-primary cursor-pointer flex-1"
              >
                Swap Mouse Buttons
              </Label>
            </div>

            {/* Use Remote Keyboard Map */}
            <div className="flex items-center gap-3 p-4">
              <Checkbox
                id="keyboard-map"
                checked={settings.useRemoteKeyboardMap}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, useRemoteKeyboardMap: !!checked })
                }
                className="h-6 w-6 border-2 border-ods-border data-[state=checked]:bg-ods-accent data-[state=checked]:border-ods-accent"
              />
              <Label 
                htmlFor="keyboard-map" 
                className="text-lg text-ods-text-primary cursor-pointer flex-1"
              >
                Use Remote Keyboard Map
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 flex gap-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 bg-ods-system-greys-black border-ods-border text-ods-text-primary hover:bg-ods-system-greys-soft-grey-action h-12 text-lg font-bold"
          >
            Close
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="flex-1 bg-ods-accent text-ods-system-greys-black hover:bg-ods-accent/90 h-12 text-lg font-bold"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}