'use client';

import { Button, DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { TerminalSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { useDeviceDetails } from '@/app/devices/hooks/use-device-details';
import { MeshControlClient } from '@/lib/meshcentral/meshcentral-control';
import { MeshTunnel, TunnelState } from '@/lib/meshcentral/meshcentral-tunnel';

export const dynamic = 'force-dynamic';

const WINDOWS_POWERSHELL_CMD =
  'powershell -NoLogo -NoProfile 2>nul || "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile 2>nul || "%SystemRoot%\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile 2>nul || "%ProgramFiles%\\PowerShell\\7\\pwsh.exe" -NoLogo -NoProfile 2>nul || "%ProgramFiles(x86)%\\PowerShell\\7\\pwsh.exe" -NoLogo -NoProfile 2>nul';

interface RemoteShellPageProps {
  params: Promise<{
    deviceId: string;
  }>;
}

export default function RemoteShellPage({ params }: RemoteShellPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const resolvedParams = use(params);
  const deviceId = resolvedParams.deviceId;

  const shellTypeParam = searchParams.get('shellType');
  const shellType = useMemo<'cmd' | 'powershell'>(() => {
    return shellTypeParam === 'powershell' ? 'powershell' : 'cmd';
  }, [shellTypeParam]);

  const { deviceDetails, isLoading: isDeviceLoading, error: deviceError, fetchDeviceById } = useDeviceDetails();

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId);
    }
  }, [deviceId, fetchDeviceById]);

  const meshcentralAgentId = useMemo(() => {
    return deviceDetails?.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId;
  }, [deviceDetails]);

  const hostname = useMemo(() => {
    return deviceDetails?.hostname || deviceDetails?.displayName;
  }, [deviceDetails]);

  const organizationName = useMemo(() => {
    return deviceDetails?.organization;
  }, [deviceDetails]);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any | null>(null);
  const fitRef = useRef<any | null>(null);
  const tunnelRef = useRef<MeshTunnel | null>(null);
  const [state, setState] = useState<TunnelState>(0);
  const [connecting, setConnecting] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  const powershellCommandSentRef = useRef(false);
  const [isPageReady, setIsPageReady] = useState(false);

  useEffect(() => {
    if (meshcentralAgentId) {
      const timer = setTimeout(() => setIsPageReady(true), 0);
      return () => clearTimeout(timer);
    }
  }, [meshcentralAgentId]);

  useEffect(() => {
    if (!isPageReady) return;

    let isDisposed = false;

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);

      if (isDisposed) return;

      const term = new Terminal({
        fontFamily: 'monospace',
        theme: { background: '#000000' },
        cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current!);
      fit.fit();
      term.focus();
      termRef.current = term;
      fitRef.current = fit;

      const handleResize = () => {
        try {
          fit.fit();
        } catch {}
        if (tunnelRef.current && termRef.current) {
          tunnelRef.current.sendCtrl({ ctrlChannel: 102938, type: 'termsize', cols: term.cols, rows: term.rows });
        }
      };
      window.addEventListener('resize', handleResize);
      const disposeResize = term.onResize(() => handleResize);
      const disposeData = term.onData((d: string) => tunnelRef.current?.sendBinary(new TextEncoder().encode(d)));

      (termRef as any).cleanup = () => {
        window.removeEventListener('resize', handleResize);
        disposeResize.dispose();
        disposeData.dispose();
        tunnelRef.current?.stop();
        term.dispose();
        termRef.current = null;
        fitRef.current = null;
      };
    })();

    return () => {
      isDisposed = true;
      const assignedCleanup = (termRef as any).cleanup as (() => void) | undefined;
      if (assignedCleanup) assignedCleanup();
    };
  }, [isPageReady]);

  useEffect(() => {
    if (
      state === 3 &&
      shellType === 'powershell' &&
      hasReceivedData &&
      !powershellCommandSentRef.current &&
      tunnelRef.current
    ) {
      setTimeout(() => {
        if (tunnelRef.current && !powershellCommandSentRef.current) {
          tunnelRef.current.sendBinary(new TextEncoder().encode(WINDOWS_POWERSHELL_CMD + '\r'));
          powershellCommandSentRef.current = true;
        }
      }, 100);
    }
  }, [state, shellType, hasReceivedData]);

  useEffect(() => {
    if (!isPageReady || !meshcentralAgentId) return;

    let control: MeshControlClient | undefined;
    (async () => {
      setConnecting(true);
      try {
        control = new MeshControlClient();
        const { authCookie } = await control.getAuthCookies();
        const term = termRef.current;
        if (!term) throw new Error('Terminal not initialized');
        const tunnel = new MeshTunnel({
          authCookie,
          nodeId: meshcentralAgentId,
          protocol: 1,
          options: { cols: term.cols, rows: term.rows },
          onData: data => {
            setHasReceivedData(true);
            if (typeof data === 'string') term.write(data);
            else term.write(new TextDecoder().decode(data));
          },
          onCtrlMessage: () => {},
          onConsoleMessage: msg => {
            toast({ title: 'Remote Shell', description: msg, variant: 'default' });
          },
          onRequestPairing: async relayId => {
            try {
              if (!control) return;
              await control.openSession();
              control.sendRelayTunnel(meshcentralAgentId, relayId, 1);
            } catch {}
          },
          onStateChange: s => setState(s),
        });
        tunnelRef.current = tunnel;
        try {
          await control.openSession();
        } catch {}
        tunnel.start();
      } catch (e) {
        toast({ title: 'Remote Shell failed', description: (e as Error).message, variant: 'destructive' });
      } finally {
        setConnecting(false);
      }
    })();
    return () => {
      control?.close();
    };
  }, [isPageReady, meshcentralAgentId, toast]);

  const handleBack = () => {
    tunnelRef.current?.stop();
    router.push(`/devices/details/${deviceId}`);
  };

  const statusText = state === 3 ? 'Connected' : state === 2 ? 'Open' : state === 1 ? 'Connecting' : 'Idle';
  const statusColor =
    state === 3
      ? 'text-ods-attention-green-success'
      : state === 1 || state === 2
        ? 'text-ods-text-secondary'
        : 'text-ods-text-secondary';

  const shellLabel = shellType === 'powershell' ? 'PowerShell' : 'Terminal';

  // Loading skeleton
  if (isDeviceLoading) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col overflow-hidden animate-pulse">
          <div className="bg-ods-system-greys-background py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-ods-border rounded" />
              <div className="w-28 h-5 bg-ods-border rounded" />
            </div>
          </div>
          <div className="bg-ods-card border rounded-md border-ods-border flex items-center justify-between py-2 px-4 mb-2 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-ods-card border border-ods-border rounded-md p-2">
                <div className="w-4 h-4 bg-ods-border rounded" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="w-48 h-5 bg-ods-border rounded" />
                <div className="w-36 h-4 bg-ods-border rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-10 bg-ods-border rounded-md" />
            </div>
          </div>
          <div className="flex-1 min-h-0 pb-4">
            <div className="h-full bg-ods-card rounded-lg border border-ods-border overflow-hidden flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <TerminalSquare className="w-16 h-16 text-ods-border" />
                <div className="w-48 h-4 bg-ods-border rounded" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (deviceError) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">Error: {deviceError}</div>
          <Button onClick={() => router.push('/devices')}>Back to Devices</Button>
        </div>
      </AppLayout>
    );
  }

  // Missing MeshCentral agent
  if (!meshcentralAgentId) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">
            Error: MeshCentral Agent ID not available for this device
          </div>
          <p className="text-ods-text-secondary">Remote shell requires MeshCentral agent to be connected.</p>
          <Button onClick={() => router.push(`/devices/details/${deviceId}`)}>Back to Device</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <DetailPageContainer
        title="Remote Shell"
        className="h-full"
        contentClassName="flex flex-col"
        backButton={{
          label: 'Back to Device',
          onClick: handleBack,
        }}
      >
        <div className="bg-ods-card border rounded-md border-ods-border flex items-center justify-between py-2 px-4 mb-2 flex-shrink-0">
          {/* Device info */}
          <div className="flex items-center gap-4">
            <div className="bg-ods-card border border-ods-border rounded-md p-2">
              <TerminalSquare className="w-4 h-4 text-ods-text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-ods-text-primary text-lg font-medium">{hostname || `Device ${deviceId}`}</h1>
              <p className="text-ods-text-secondary text-sm">
                {shellLabel} {organizationName ? `\u2022 ${organizationName}` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <span className={`text-sm ${statusColor}`}>
              {statusText}
              {connecting ? '\u2026' : ''}
            </span>
            <Button
              onClick={() => tunnelRef.current?.stop()}
              variant="outline"
              className="bg-ods-card border border-ods-border text-ods-text-primary"
              disabled={state !== 3}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Terminal */}
        <div className="flex-1 min-h-0 pb-4">
          <div className="h-full bg-black rounded-lg overflow-hidden">
            <div ref={containerRef} className="w-full h-full p-2" />
          </div>
        </div>
      </DetailPageContainer>
    </AppLayout>
  );
}
