'use client';

import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  PageLayout,
  Skeleton,
} from '@flamingo-stack/openframe-frontend-core';
import {
  Collapse02Icon,
  Expand02Icon,
  MonitorIcon,
  Settings01Icon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDeviceDetails } from '@/app/(app)/devices/hooks/use-device-details';
import { CONTEXT_ENTITY_KIND } from '@/app/(app)/mingo/context/context-types';
import { useTrackOpenView } from '@/app/(app)/mingo/context/use-track-open-view';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { MeshControlClient } from '@/lib/meshcentral/meshcentral-control';
import { type DisplayInfo, MeshDesktop } from '@/lib/meshcentral/meshcentral-desktop';
import { MeshTunnel, type TunnelState } from '@/lib/meshcentral/meshcentral-tunnel';
import { DEFAULT_SETTINGS, RemoteDesktopSettings, type RemoteSettingsConfig } from '@/lib/meshcentral/remote-settings';
import { routes } from '@/lib/routes';
import { type ActionHandlers, createActionsMenuGroups } from './actions-menu-config';
import { RemoteSettingsModal } from './remote-settings-modal';

interface LegacyDeviceData {
  id: string;
  meshcentralAgentId?: string;
  hostname?: string;
  organization?: string | { name?: string };
}

export default function RemoteDesktopPage() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('id') ?? '';
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const safeBackToDevice = useSafeBack(routes.devices.details(deviceId));
  const safeBackToDevices = useSafeBack(routes.devices.list);

  // Check for legacy deviceData query param (backward compatibility)
  const deviceDataParam = searchParams.get('deviceData');
  const legacyDeviceData = useMemo((): LegacyDeviceData | null => {
    if (!deviceDataParam) return null;
    try {
      return JSON.parse(deviceDataParam);
    } catch {
      return null;
    }
  }, [deviceDataParam]);

  // Fetch device data internally if no legacy data provided
  const {
    deviceDetails,
    isLoading: isDeviceLoading,
    error: deviceError,
  } = useDeviceDetails(!legacyDeviceData ? deviceId : null, { polling: false });

  // Extract device info from either legacy data or fetched data
  const meshcentralAgentId = useMemo(() => {
    if (legacyDeviceData?.meshcentralAgentId) {
      return legacyDeviceData.meshcentralAgentId;
    }
    return deviceDetails?.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId;
  }, [legacyDeviceData, deviceDetails]);

  const hostname = useMemo(() => {
    if (legacyDeviceData?.hostname) {
      return legacyDeviceData.hostname;
    }
    return deviceDetails?.hostname || deviceDetails?.displayName;
  }, [legacyDeviceData, deviceDetails]);

  const organizationName = useMemo(() => {
    if (legacyDeviceData?.organization) {
      return typeof legacyDeviceData.organization === 'string'
        ? legacyDeviceData.organization
        : legacyDeviceData.organization?.name;
    }
    return deviceDetails?.organization;
  }, [legacyDeviceData, deviceDetails]);

  // Keep this device as the Mingo "open view" while on the remote-desktop surface
  // (the parent detail page unmounted on navigation, clearing its own openView).
  useTrackOpenView(hostname ? { type: CONTEXT_ENTITY_KIND.DEVICE, id: deviceId, label: hostname } : null);

  // Remote desktop state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desktopRef = useRef<MeshDesktop | null>(null);
  const tunnelRef = useRef<MeshTunnel | null>(null);
  const controlRef = useRef<MeshControlClient | null>(null);
  const initializingRef = useRef(false);
  const remoteSettingsRef = useRef<RemoteSettingsConfig>(DEFAULT_SETTINGS);
  const [state, setState] = useState<TunnelState>(0);
  const [enableInput, setEnableInput] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettingsConfig>(DEFAULT_SETTINGS);
  const isReconnectingRef = useRef(false);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState(0);
  const currentDisplayRef = useRef(currentDisplay);
  const [firstFrameReceived, setFirstFrameReceived] = useState(false);
  const [clipboardEnabled, setClipboardEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    currentDisplayRef.current = currentDisplay;
  }, [currentDisplay]);

  useEffect(() => {
    remoteSettingsRef.current = remoteSettings;
  }, [remoteSettings]);

  useEffect(() => {
    if (meshcentralAgentId) setIsPageReady(true);
  }, [meshcentralAgentId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    onFullscreenChange();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (isFullscreen) canvasRef.current?.focus();
  }, [isFullscreen]);

  useEffect(() => {
    if (!isPageReady) return;

    const desktop = new MeshDesktop();
    desktopRef.current = desktop;

    desktop.onFirstFrame?.(() => setFirstFrameReceived(true));

    // Set up display list change callback
    desktop.onDisplayListChange?.(newDisplays => {
      setDisplays(newDisplays);
      // Auto-select primary display if available
      const primaryDisplay = newDisplays.find(d => d.primary);
      if (primaryDisplay && currentDisplayRef.current === 0) {
        setCurrentDisplay(primaryDisplay.id);
      }
    });

    const canvas = canvasRef.current;
    if (canvas) {
      desktop.attach(canvas);
      desktop.setViewOnly(false);
    }
    return () => {
      desktop.detach();
      if (desktopRef.current === desktop) {
        desktopRef.current = null;
      }
    };
  }, [isPageReady]);

  useEffect(() => {
    if (!isPageReady || !meshcentralAgentId || initializingRef.current) return;

    initializingRef.current = true;
    setFirstFrameReceived(false);
    let cancelled = false;
    let control: MeshControlClient | undefined;
    let tunnel: MeshTunnel | undefined;
    (async () => {
      try {
        control = new MeshControlClient();
        if (cancelled) return;
        controlRef.current = control;
        const { authCookie } = await control.getAuthCookies();
        if (cancelled) return;
        tunnel = new MeshTunnel({
          authCookie,
          nodeId: meshcentralAgentId,
          protocol: 2,
          getAuthCookie: () => controlRef.current?.getCachedAuthCookie() ?? null,
          onBeforeReconnect: async () => {
            try {
              const ctrl = controlRef.current;
              if (ctrl && !ctrl.isConnected()) {
                await ctrl.openSession();
              }
            } catch {}
          },
          onData: () => {},
          onBinaryData: bytes => {
            desktopRef.current?.onBinaryFrame(bytes);
          },
          onCtrlMessage: () => {},
          onConsoleMessage: msg => {
            toastRef.current({ title: 'Remote Desktop', description: msg, variant: 'default' });
          },
          onRequestPairing: async relayId => {
            try {
              const ctrl = controlRef.current;
              if (!ctrl) return;
              await ctrl.openSession();
              const cookies = await ctrl.getAuthCookies();
              tunnelRef.current?.updateAuthCookie(cookies.authCookie);
              ctrl.sendDesktopTunnel(meshcentralAgentId, relayId);
            } catch {}
          },
          onStateChange: s => {
            setState(s);
            if (s === 1 && tunnelRef.current?.getState() === 0) {
              isReconnectingRef.current = true;
              toastRef.current({
                title: 'Connection Lost',
                description: 'Attempting to reconnect...',
                variant: 'info',
              });
            } else if (s === 3 && isReconnectingRef.current) {
              isReconnectingRef.current = false;
              toastRef.current({
                title: 'Reconnected',
                description: 'Connection restored successfully',
                variant: 'success',
              });
            } else if (s === 0 && isReconnectingRef.current) {
              isReconnectingRef.current = false;
              toastRef.current({
                title: 'Reconnection Failed',
                description: 'Unable to restore connection. Please try again.',
                variant: 'destructive',
              });
            }
          },
        });
        if (cancelled) return;
        tunnelRef.current = tunnel;
        desktopRef.current?.setSender(data => {
          tunnel?.sendBinary(data);
        });
        try {
          await control.openSession();
        } catch {}
        if (cancelled) return;
        tunnel.start();
      } catch (e) {
        if (cancelled) return;
        toastRef.current({ title: 'Remote Desktop failed', description: (e as Error).message, variant: 'destructive' });
      }
    })();
    return () => {
      cancelled = true;
      isReconnectingRef.current = false;
      initializingRef.current = false;
      controlRef.current = null;
      control?.close();
      tunnel?.stop();
      tunnelRef.current = null;
    };
  }, [isPageReady, meshcentralAgentId]);

  useEffect(() => {
    if (state !== 3) return;
    const tunnel = tunnelRef.current;
    if (!tunnel) return;

    try {
      const settingsManager = new RemoteDesktopSettings(remoteSettingsRef.current);
      settingsManager.setWebSocket(tunnel);
      settingsManager.applySettings();
    } catch (error) {
      console.error('Failed to apply initial settings:', error);
    }
  }, [state]);

  // Clipboard interceptor
  useEffect(() => {
    if (!isPageReady) return;
    const desktop = desktopRef.current;
    if (!desktop) return;
    if (!clipboardEnabled) {
      desktop.setClipboardInterceptor?.(null);
      return;
    }

    desktop.setClipboardInterceptor?.((type, sendKeys) => {
      if (type === 'paste') {
        (async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (text && controlRef.current && meshcentralAgentId) {
              await controlRef.current.setClipboard(meshcentralAgentId, text);
            }
          } catch {
            // Clipboard read failed (permissions/insecure context) — proceed anyway
          }
          sendKeys();
        })();
      } else {
        sendKeys();
        (async () => {
          try {
            await new Promise(r => setTimeout(r, 250));
            if (controlRef.current && meshcentralAgentId) {
              const text = await controlRef.current.getClipboard(meshcentralAgentId);
              if (text) await navigator.clipboard.writeText(text);
            }
          } catch {
            // Clipboard write failed (permissions/insecure context) — ignore
          }
        })();
      }
    });

    return () => {
      desktop.setClipboardInterceptor?.(null);
    };
  }, [clipboardEnabled, meshcentralAgentId, isPageReady]);

  const handleBack = () => {
    tunnelRef.current?.stop();
    safeBackToDevice();
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      toast({ title: 'Fullscreen failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {}
  };

  const sendPower = async (action: 'wake' | 'sleep' | 'reset' | 'poweroff') => {
    if (!meshcentralAgentId) return;
    try {
      const client = controlRef.current || new MeshControlClient();
      if (!controlRef.current) controlRef.current = client;
      await client.powerAction(meshcentralAgentId, action);
      toast({ title: 'Power action', description: `${action} sent`, variant: 'success' });
    } catch (e) {
      toast({ title: 'Power action failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const sendKeyCombo = (keys: number[]) => {
    const desktop = desktopRef.current;
    if (!desktop) return;

    const keyMappings: Record<string, string> = {
      [`${0x5b},${0x4d}`]: 'win+m',
      [`${0x5b},${0x28}`]: 'win+down',
      [`${0x5b},${0x26}`]: 'win+up',
      [`${0x10},${0x5b},${0x4d}`]: 'shift+win+m',
      [`${0x5b},${0x4c}`]: 'win+l',
      [`${0x5b},${0x52}`]: 'win+r',
      [`${0x11},${0x57}`]: 'ctrl+w',
    };

    const comboString = keyMappings[keys.join(',')];
    if (comboString) {
      desktop.sendKeyCombo(comboString);
    } else {
      console.warn('Unmapped key combination:', keys);
    }
  };

  const sendCtrlAltDel = () => {
    if (state !== 3) return;
    desktopRef.current?.sendCtrlAltDel();
    toast({
      title: 'Ctrl+Alt+Del',
      description: 'Shortcut sent',
      variant: 'success',
      duration: 2000,
    });
  };

  const handleDisplayChange = (displayId: number) => {
    try {
      desktopRef.current?.switchDisplay?.(displayId);
      setCurrentDisplay(displayId);
      toast({
        title: 'Display Switched',
        description: `Switched to display ${displayId}`,
        variant: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Display Switch Failed',
        description: error instanceof Error ? error.message : 'Unable to switch display',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const actionHandlers: ActionHandlers = {
    sendCtrlAltDel,
    sendKeyCombo,
    sendPower,
    setEnableInput: (enabled: boolean) => {
      setEnableInput(enabled);
      desktopRef.current?.setViewOnly(!enabled);
    },
    setClipboardEnabled,
    toast,
  };

  const actionsMenuGroups = createActionsMenuGroups(actionHandlers, enableInput, clipboardEnabled);

  const displayMenuGroups: ActionsMenuGroup[] =
    displays.length > 1
      ? [
          {
            items: [
              ...(displays.some(d => d.id === 0) || displays.length > 1
                ? [
                    {
                      id: 'display-all',
                      label: 'All Displays',
                      icon: <MonitorIcon className="w-4 h-4" />,
                      type: 'checkbox' as const,
                      checked: currentDisplay === 0,
                      onClick: () => handleDisplayChange(0),
                    },
                  ]
                : []),
              ...displays
                .filter(d => d.id !== 0)
                .map(display => ({
                  id: `display-${display.id}`,
                  label: `Display ${display.id}${display.primary ? ' (Primary)' : ''}`,
                  icon: <MonitorIcon className="w-4 h-4" />,
                  type: 'checkbox' as const,
                  checked: currentDisplay === display.id,
                  onClick: () => handleDisplayChange(display.id),
                })),
            ],
          },
        ]
      : [];

  if (!legacyDeviceData && isDeviceLoading) {
    return (
      <PageLayout
        className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] h-full overflow-hidden"
        backButton={{ label: 'Back', onClick: handleBack }}
      >
        <div className="bg-ods-card border rounded-md border-ods-border flex items-center justify-between gap-[var(--spacing-system-mf)] py-[var(--spacing-system-xs)] px-[var(--spacing-system-mf)] flex-shrink-0">
          <div className="flex items-center gap-[var(--spacing-system-mf)] min-w-0">
            <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
            <div className="flex flex-col gap-[var(--spacing-system-xxs)] min-w-0">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-system-xs)] flex-shrink-0">
            <Skeleton className="h-11 w-11 md:h-12 md:w-12 rounded-lg" />
            <Skeleton className="h-11 w-11 md:h-12 md:w-12 rounded-lg" />
            <Skeleton className="h-11 w-11 md:h-12 md:w-12 rounded-lg" />
          </div>
        </div>

        <div className="flex-1 min-h-0 min-w-0 bg-black rounded-lg" />
      </PageLayout>
    );
  }

  if (!legacyDeviceData && deviceError) {
    return (
      <div className="p-[var(--spacing-system-l)] h-full flex flex-col items-center justify-center gap-[var(--spacing-system-mf)]">
        <div className="text-ods-attention-red-error text-lg">Error: {deviceError}</div>
        <Button onClick={safeBackToDevices}>Back</Button>
      </div>
    );
  }

  if (!meshcentralAgentId) {
    return (
      <div className="p-[var(--spacing-system-l)] h-full flex flex-col items-center justify-center gap-[var(--spacing-system-mf)]">
        <div className="text-ods-attention-red-error text-lg">
          Error: MeshCentral Agent ID not available for this device
        </div>
        <p className="text-ods-text-secondary">Remote desktop requires MeshCentral agent to be connected.</p>
        <Button onClick={safeBackToDevice}>Back</Button>
      </div>
    );
  }

  const deviceInfoBlock = (
    <div className="flex items-center gap-[var(--spacing-system-mf)] min-w-0">
      <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-xsf)] flex-shrink-0">
        <MonitorIcon className="w-4 h-4 text-ods-text-primary" />
      </div>
      <div className="flex flex-col min-w-0">
        <h1 className="text-ods-text-primary text-lg font-medium truncate">{hostname || `Device ${deviceId}`}</h1>
        <p className="text-ods-text-secondary text-sm truncate">Desktop • {organizationName || 'Unknown Customer'}</p>
      </div>
    </div>
  );

  const controlsBar = (
    <div
      className={`bg-ods-card border border-ods-border flex items-center justify-between gap-[var(--spacing-system-mf)] py-[var(--spacing-system-xs)] px-[var(--spacing-system-mf)] flex-shrink-0 ${
        isFullscreen ? '' : 'rounded-md'
      }`}
    >
      {deviceInfoBlock}
      <div className="flex items-center gap-[var(--spacing-system-xs)] flex-shrink-0">
        {displays.length > 1 && (
          <ActionsMenuDropdown
            groups={displayMenuGroups}
            customTrigger={
              <Button variant="outline" leftIcon={<MonitorIcon className="w-4 h-4 md:w-6 md:h-6" />}>
                Display {currentDisplay === 0 ? 'All' : currentDisplay}
              </Button>
            }
          />
        )}
        <ActionsMenuDropdown groups={actionsMenuGroups} triggerAriaLabel="Actions" />
        <Button
          variant="outline"
          size="icon"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
          leftIcon={<Settings01Icon />}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={isFullscreen ? exitFullscreen : enterFullscreen}
          leftIcon={isFullscreen ? <Collapse02Icon /> : <Expand02Icon />}
        />
      </div>
    </div>
  );

  const canvasContainer = (
    <div className={`flex-1 min-h-0 min-w-0 relative bg-black overflow-hidden ${isFullscreen ? '' : 'rounded-lg'}`}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 w-full h-full object-contain outline-none"
        style={{ visibility: firstFrameReceived ? 'visible' : 'hidden' }}
        onContextMenu={e => e.preventDefault()}
      />
      {!firstFrameReceived && state >= 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--spacing-system-sf)]">
          <Loader2 className="w-8 h-8 text-ods-text-secondary animate-spin" />
          <span className="text-ods-text-secondary text-sm">
            {state === 3 ? 'Waiting for desktop stream...' : 'Connecting to desktop...'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <PageLayout
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] h-full overflow-hidden"
      backButton={{ label: 'Back', onClick: handleBack }}
      showHeader={!isFullscreen}
    >
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-black flex flex-col' : 'contents'}>
        {controlsBar}
        {canvasContainer}
      </div>

      <RemoteSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentSettings={remoteSettings}
        desktopRef={desktopRef}
        tunnelRef={tunnelRef}
        connectionState={state}
        onSettingsChange={setRemoteSettings}
      />
    </PageLayout>
  );
}
