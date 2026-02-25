'use client'

import { useEffect, useRef, useState, use, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor, MoreHorizontal, Settings, Loader2 } from 'lucide-react'
import { Button, DetailPageContainer, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, ActionsMenu, ActionsMenuGroup } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { AppLayout } from '@app/components/app-layout'
import { MeshControlClient } from '@lib/meshcentral/meshcentral-control'
import { MeshTunnel, TunnelState } from '@lib/meshcentral/meshcentral-tunnel'
import { MeshDesktop } from '@lib/meshcentral/meshcentral-desktop'
import { RemoteSettingsModal } from './remote-settings-modal'
import { RemoteSettingsConfig, DEFAULT_SETTINGS, RemoteDesktopSettings } from '@lib/meshcentral/remote-settings'
import { createActionsMenuGroups, ActionHandlers } from './actions-menu-config'
import { DisplayInfo } from '@lib/meshcentral/meshcentral-desktop'
import { useDeviceDetails } from '@app/devices/hooks/use-device-details'

interface RemoteDesktopPageProps {
  params: Promise<{
    deviceId: string
  }>
}

interface LegacyDeviceData {
  id: string
  meshcentralAgentId?: string
  hostname?: string
  organization?: string | { name?: string }
}

export default function RemoteDesktopPage({ params }: RemoteDesktopPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const resolvedParams = use(params)
  const deviceId = resolvedParams.deviceId

  // Check for legacy deviceData query param (backward compatibility)
  const deviceDataParam = searchParams.get('deviceData')
  const legacyDeviceData = useMemo((): LegacyDeviceData | null => {
    if (!deviceDataParam) return null
    try {
      return JSON.parse(deviceDataParam)
    } catch {
      return null
    }
  }, [deviceDataParam])

  // Fetch device data internally if no legacy data provided
  const { deviceDetails, isLoading: isDeviceLoading, error: deviceError, fetchDeviceById } = useDeviceDetails()

  // Fetch device on mount if no legacy data
  useEffect(() => {
    if (!legacyDeviceData && deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, legacyDeviceData, fetchDeviceById])

  // Extract device info from either legacy data or fetched data
  const meshcentralAgentId = useMemo(() => {
    if (legacyDeviceData?.meshcentralAgentId) {
      return legacyDeviceData.meshcentralAgentId
    }
    return deviceDetails?.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId
  }, [legacyDeviceData, deviceDetails])

  const hostname = useMemo(() => {
    if (legacyDeviceData?.hostname) {
      return legacyDeviceData.hostname
    }
    return deviceDetails?.hostname || deviceDetails?.displayName
  }, [legacyDeviceData, deviceDetails])

  const organizationName = useMemo(() => {
    if (legacyDeviceData?.organization) {
      return typeof legacyDeviceData.organization === 'string'
        ? legacyDeviceData.organization
        : legacyDeviceData.organization?.name
    }
    return deviceDetails?.organization
  }, [legacyDeviceData, deviceDetails])

  // Remote desktop state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desktopRef = useRef<MeshDesktop | null>(null)
  const tunnelRef = useRef<MeshTunnel | null>(null)
  const controlRef = useRef<MeshControlClient | null>(null)
  const initializingRef = useRef(false)
  const remoteSettingsRef = useRef<RemoteSettingsConfig>(DEFAULT_SETTINGS)
  const [state, setState] = useState<TunnelState>(0)
  const [connecting, setConnecting] = useState(false)
  const [enableInput, setEnableInput] = useState(true)
  const [isPageReady, setIsPageReady] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettingsConfig>(DEFAULT_SETTINGS)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [currentDisplay, setCurrentDisplay] = useState(0)
  const [firstFrameReceived, setFirstFrameReceived] = useState(false)

  useEffect(() => {
    remoteSettingsRef.current = remoteSettings
  }, [remoteSettings])

  // Set page ready when we have meshcentralAgentId
  useEffect(() => {
    if (meshcentralAgentId) {
      const timer = setTimeout(() => setIsPageReady(true), 0)
      return () => clearTimeout(timer)
    }
  }, [meshcentralAgentId])

  useEffect(() => {
    if (!isPageReady) return

    const desktop = new MeshDesktop()
    desktopRef.current = desktop

    desktop.onFirstFrame?.(() => setFirstFrameReceived(true))

    // Set up display list change callback
    desktop.onDisplayListChange?.((newDisplays) => {
      setDisplays(newDisplays)
      // Auto-select primary display if available
      const primaryDisplay = newDisplays.find(d => d.primary)
      if (primaryDisplay && currentDisplay === 0) {
        setCurrentDisplay(primaryDisplay.id)
      }
    })

    const canvas = canvasRef.current
    if (canvas) {
      desktop.attach(canvas)
      desktop.setViewOnly(!enableInput)
      return () => {
        desktop.detach()
      }
    }
  }, [isPageReady])

  useEffect(() => {
    if (!isPageReady || !meshcentralAgentId || initializingRef.current) return

    initializingRef.current = true
    setFirstFrameReceived(false)
    let control: MeshControlClient | undefined
    ;(async () => {
      setConnecting(true)
      try {
        control = new MeshControlClient()
        controlRef.current = control
        const { authCookie } = await control.getAuthCookies()
        const tunnel = new MeshTunnel({
          authCookie,
          nodeId: meshcentralAgentId,
          protocol: 2,
          onData: () => {},
          onBinaryData: (bytes) => { desktopRef.current?.onBinaryFrame(bytes) },
          onCtrlMessage: () => {},
          onConsoleMessage: (msg) => { toast({ title: 'Remote Desktop', description: msg, variant: 'default' }) },
          onRequestPairing: async (relayId) => {
            try {
              const ctrl = controlRef.current
              if (!ctrl) return
              await ctrl.openSession()
              ctrl.sendDesktopTunnel(meshcentralAgentId, relayId)
            } catch {}
          },
          onStateChange: (s) => {
            setState(s)
            if (s === 1 && tunnelRef.current?.getState() === 0) {
              setIsReconnecting(true)
              setReconnectAttempt(prev => prev + 1)
              toast({
                title: 'Connection Lost',
                description: 'Attempting to reconnect...',
                variant: 'info'
              })
            } else if (s === 3 && isReconnecting) {
              setIsReconnecting(false)
              toast({
                title: 'Reconnected',
                description: 'Connection restored successfully',
                variant: 'success'
              })
            } else if (s === 0 && isReconnecting) {
              setIsReconnecting(false)
              toast({
                title: 'Reconnection Failed',
                description: 'Unable to restore connection. Please try again.',
                variant: 'destructive'
              })
            }
          }
        })
        tunnelRef.current = tunnel
        desktopRef.current?.setSender((data) => {
          tunnel.sendBinary(data)
        })
        try {
          await control.openSession()
        } catch {}
        tunnel.start()
      } catch (e) {
        toast({ title: 'Remote Desktop failed', description: (e as Error).message, variant: 'destructive' })
      } finally {
        setConnecting(false)
      }
    })()
    return () => {
      initializingRef.current = false
      controlRef.current = null
      control?.close();
      tunnelRef.current?.stop()
    }
  }, [isPageReady, meshcentralAgentId, toast])

  useEffect(() => {
    if (state !== 3) return
    const tunnel = tunnelRef.current
    if (!tunnel) return

    try {
      const settingsManager = new RemoteDesktopSettings(remoteSettingsRef.current)
      settingsManager.setWebSocket(tunnel)
      settingsManager.applySettings()
    } catch (error) {
      console.error('Failed to apply initial settings:', error)
    }
  }, [state])

  const handleBack = () => {
    tunnelRef.current?.stop()
    router.push(`/devices/details/${deviceId}`)
  }

  const statusText = isReconnecting
    ? `Reconnecting... (Attempt ${reconnectAttempt})`
    : state === 3
      ? 'Connected'
      : state === 2
        ? 'Open'
        : state === 1
          ? 'Connecting'
          : 'Idle'
  const statusColor = isReconnecting
    ? 'text-ods-text-secondary animate-pulse'
    : state === 3
      ? 'text-ods-attention-green-success'
      : state === 1 || state === 2
        ? 'text-ods-text-secondary'
        : 'text-ods-text-secondary'

  const sendPower = async (action: 'wake' | 'sleep' | 'reset' | 'poweroff') => {
    if (!meshcentralAgentId) return
    try {
      const client = controlRef.current || new MeshControlClient()
      if (!controlRef.current) controlRef.current = client
      await client.powerAction(meshcentralAgentId, action)
      toast({ title: 'Power action', description: `${action} sent`, variant: 'success' })
    } catch (e) {
      toast({ title: 'Power action failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const sendKey = (keyCode: number, isUp: boolean = false) => {
    if (!desktopRef.current || !tunnelRef.current || state !== 3) return
    // 6-byte message: [type=0x0001][size=0x0006][action][vk]
    const buf = new Uint8Array(6)
    buf[0] = 0x00
    buf[1] = 0x01 // MNG_KVM_KEY command
    buf[2] = 0x00
    buf[3] = 0x06 // Total size (header + payload)
    buf[4] = isUp ? 0x01 : 0x00 // Action: 0=down, 1=up
    buf[5] = keyCode & 0xff // Virtual-Key code
    tunnelRef.current.sendBinary(buf)
  }

  const sendKeyCombo = (keys: number[]) => {
    if (!desktopRef.current) return

    const keyMappings: Record<string, string> = {
      [`${0x5B},${0x4D}`]: 'win+m',
      [`${0x5B},${0x28}`]: 'win+down',
      [`${0x5B},${0x26}`]: 'win+up',
      [`${0x10},${0x5B},${0x4D}`]: 'shift+win+m',
      [`${0x5B},${0x4C}`]: 'win+l',
      [`${0x5B},${0x52}`]: 'win+r',
      [`${0x11},${0x57}`]: 'ctrl+w',
    }

    const keyString = keys.join(',')
    const comboString = keyMappings[keyString]

    if (comboString) {
      desktopRef.current.sendKeyCombo(comboString)
    } else {
      console.warn('Unmapped key combination:', keys, 'keyString:', keyString)
      // Fallback to manual key sequence for unmapped combinations
      keys.forEach((key, index) => {
        setTimeout(() => sendKey(key, false), index * 50)
      })
      keys.slice().reverse().forEach((key, index) => {
        setTimeout(() => sendKey(key, true), (keys.length + index) * 50)
      })
    }
  }

  const sendCtrlAltDel = () => {
    if (!tunnelRef.current || state !== 3) return
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setUint16(0, 0x000A, false) // MNG_CTRLALTDEL command (big-endian)
    view.setUint16(2, 0x0000, false) // Size = 0 (no data payload)

    const buf = new Uint8Array(buffer)
    tunnelRef.current.sendBinary(buf)

    toast({
      title: "Ctrl+Alt+Del",
      description: "Shortcut sent",
      variant: "success",
      duration: 2000
    })
  }

  const handleDisplayChange = (displayId: number) => {
    try {
      desktopRef.current?.switchDisplay?.(displayId)
      setCurrentDisplay(displayId)
      toast({
        title: "Display Switched",
        description: `Switched to display ${displayId}`,
        variant: "success",
        duration: 2000
      })
    } catch (error) {
      toast({
        title: "Display Switch Failed",
        description: error instanceof Error ? error.message : "Unable to switch display",
        variant: "destructive",
        duration: 4000
      })
    }
  }

  const actionHandlers: ActionHandlers = {
    sendCtrlAltDel,
    sendKeyCombo,
    sendPower,
    setEnableInput: (enabled: boolean) => {
      setEnableInput(enabled)
      desktopRef.current?.setViewOnly(!enabled)
    },
    toast
  }

  const actionsMenuGroups = createActionsMenuGroups(actionHandlers, enableInput)

  const displayMenuGroups: ActionsMenuGroup[] = displays.length > 1 ? [
    {
      items: [
        ...(displays.some(d => d.id === 0) || displays.length > 1 ? [{
          id: 'display-all',
          label: 'All Displays',
          icon: <Monitor className="w-4 h-4" />,
          type: 'checkbox' as const,
          checked: currentDisplay === 0,
          onClick: () => handleDisplayChange(0)
        }] : []),
        ...displays.filter(d => d.id !== 0).map((display) => ({
          id: `display-${display.id}`,
          label: `Display ${display.id}${display.primary ? ' (Primary)' : ''}`,
          icon: <Monitor className="w-4 h-4" />,
          type: 'checkbox' as const,
          checked: currentDisplay === display.id,
          onClick: () => handleDisplayChange(display.id)
        }))
      ]
    }
  ] : []

  // Loading skeleton that matches the actual remote desktop layout
  if (!legacyDeviceData && isDeviceLoading) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col overflow-hidden animate-pulse">
          {/* Back Button Skeleton */}
          <div className="bg-ods-system-greys-background py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-ods-border rounded" />
              <div className="w-28 h-5 bg-ods-border rounded" />
            </div>
          </div>

          {/* Header Bar Skeleton */}
          <div className="bg-ods-card border rounded-md border-ods-border flex items-center justify-between py-2 px-4 mb-2 flex-shrink-0">
            {/* Device info skeleton */}
            <div className="flex items-center gap-4">
              {/* Device Icon Skeleton */}
              <div className="bg-ods-card border border-ods-border rounded-md p-2">
                <div className="w-4 h-4 bg-ods-border rounded" />
              </div>

              {/* Device Info Skeleton */}
              <div className="flex flex-col gap-1">
                <div className="w-48 h-5 bg-ods-border rounded" />
                <div className="w-36 h-4 bg-ods-border rounded" />
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-10 bg-ods-border rounded-md" />
              <div className="w-24 h-10 bg-ods-border rounded-md" />
            </div>
          </div>

          {/* Remote Desktop Canvas Skeleton */}
          <div className="flex-1 min-h-0 pb-4">
            <div className="h-full bg-ods-card rounded-lg border border-ods-border overflow-hidden flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Monitor className="w-16 h-16 text-ods-border" />
                <div className="w-48 h-4 bg-ods-border rounded" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state - device not found
  if (!legacyDeviceData && deviceError) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">
            Error: {deviceError}
          </div>
          <Button onClick={() => router.push('/devices')}>
            Back to Devices
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Error state - MeshCentral agent not available
  if (!meshcentralAgentId) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">
            Error: MeshCentral Agent ID not available for this device
          </div>
          <p className="text-ods-text-secondary">
            Remote desktop requires MeshCentral agent to be connected.
          </p>
          <Button onClick={() => router.push(`/devices/details/${deviceId}`)}>
            Back to Device
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <DetailPageContainer
        className='h-full'
        contentClassName='flex flex-col'
        backButton={{
          label: 'Back to Device',
          onClick: handleBack
        }}
      >
        <div className="bg-ods-card border rounded-md border-ods-border flex items-center justify-between py-2 px-4 mb-2 flex-shrink-0">
          {/* Device info */}
          <div className="flex items-center gap-4">
            {/* Device Icon */}
            <div className="bg-ods-card border border-ods-border rounded-md p-2">
              <Monitor className="w-4 h-4 text-ods-text-primary" />
            </div>

            {/* Device Info */}
            <div className="flex flex-col">
              <h1 className="text-ods-text-primary text-lg font-medium">
                {hostname || `Device ${deviceId}`}
              </h1>
              <p className="text-ods-text-secondary text-sm">
                Desktop • {organizationName || 'Unknown Organization'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {/* Actions Dropdown */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="device-action"
                  leftIcon={<MoreHorizontal className="w-6 h-6 mr-2" />}
                >
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="p-0 border-none"
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('.fixed.z-\\[9999\\]')) {
                    e.preventDefault()
                  }
                }}
              >
                <ActionsMenu
                  groups={actionsMenuGroups}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Display Selector */}
            {displays.length > 1 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="device-action"
                    leftIcon={<Monitor className="w-6 h-6 mr-2" />}
                  >
                    Display {currentDisplay === 0 ? 'All' : currentDisplay}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="p-0 border-none"
                  onInteractOutside={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('.fixed.z-\\[9999\\]')) {
                      e.preventDefault()
                    }
                  }}
                >
                  <ActionsMenu
                    groups={displayMenuGroups}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Settings Button */}
            <Button
              variant="device-action"
              leftIcon={<Settings className="w-6 h-6 mr-2" />}
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </Button>
          </div>
        </div>

        {/* Status indicator */}
        {connecting && (
          <div className="bg-ods-card mb-2 py-2 px-4 rounded-md border border-ods-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${statusColor}`}>{statusText}</span>
              <span className="text-ods-text-secondary text-sm">…</span>
            </div>
          </div>
        )}

        {/* Remote Desktop Canvas */}
        <div className="flex-1 min-h-0 pb-4">
          <div className="h-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
            <canvas
              ref={canvasRef}
              className="block max-w-full max-h-full"
              onContextMenu={(e) => {
                e.preventDefault()
              }}
            />
            {!firstFrameReceived && state >= 1 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                <Loader2 className="w-8 h-8 text-ods-text-secondary animate-spin" />
                <span className="text-ods-text-secondary text-sm">
                  {state === 3 ? 'Waiting for desktop stream...' : 'Connecting to desktop...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        <RemoteSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentSettings={remoteSettings}
          desktopRef={desktopRef}
          tunnelRef={tunnelRef}
          connectionState={state}
          onSettingsChange={setRemoteSettings}
        />
      </DetailPageContainer>
    </AppLayout>
  )
}
