'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import {
  CommandBox,
  OPENFRAME_PATHS,
  OrganizationSelector,
  OSPlatformSelector,
  PathsDisplay,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { Button, Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { DEFAULT_OS_PLATFORM, type OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { AlertTriangle, Copy, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min';
import { useRegistrationSecret } from '../hooks/use-registration-secret';
import { useReleaseVersion } from '../hooks/use-release-version';

// Force dynamic rendering for this page due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

type Platform = OSPlatformId;

const RELEASES_BASE_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases';
const MACOS_BINARY_NAME = 'openframe-client_macos.tar.gz';
const WINDOWS_BINARY_NAME = 'openframe-client_windows.zip';

const buildBinaryUrl = (version: string, assetName: string) => {
  if (!version) {
    return `${RELEASES_BASE_URL}/latest/download/${assetName}`;
  }

  return `${RELEASES_BASE_URL}/download/${version}/${assetName}`;
};

export default function NewDevicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform>(DEFAULT_OS_PLATFORM);
  const { initialKey } = useRegistrationSecret();
  const { releaseVersion } = useReleaseVersion();
  const [argInput, setArgInput] = useState('');
  const [args, setArgs] = useState<string[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const { items: orgs, isLoading: isOrgsLoading, fetch: fetchOrgs } = useOrganizationsMin(100);

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost --localMode';
    }
    return hostname;
  }, []);

  useEffect(() => {
    fetchOrgs('').catch(() => {});
  }, [fetchOrgs]);

  // Auto-select first or "Default" organization when orgs load
  useEffect(() => {
    if (orgs.length > 0 && !selectedOrgId) {
      // Try to find "Default" organization first
      const defaultOrg = orgs.find(o => o.isDefault);
      const orgToSelect = defaultOrg || orgs[0];

      if (orgToSelect) {
        setSelectedOrgId(orgToSelect.organizationId);
      }
    }
  }, [orgs, selectedOrgId]);

  const addArgument = useCallback(() => {
    const trimmed = argInput.trim();
    if (!trimmed) return;
    setArgs(prev => [...prev, trimmed]);
    setArgInput('');
  }, [argInput]);

  const removeArg = useCallback((idx: number) => {
    setArgs(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const onArgKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addArgument();
      }
    },
    [addArgument],
  );

  const macBinaryUrl = useMemo(() => buildBinaryUrl(releaseVersion, MACOS_BINARY_NAME), [releaseVersion]);

  const windowsBinaryUrl = useMemo(() => buildBinaryUrl(releaseVersion, WINDOWS_BINARY_NAME), [releaseVersion]);

  const command = useMemo(() => {
    const orgIdArg = selectedOrgId;
    const baseArgs = `install --serverUrl ${serverUrl} --initialKey ${initialKey} --orgId ${orgIdArg}`;
    const extras = args.length ? ' ' + args.join(' ') : '';

    if (platform === 'windows') {
      const argString = `${baseArgs}${extras}`;
      return `Set-Location ~; Remove-Item -Path 'openframe-client.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri '${windowsBinaryUrl}' -OutFile 'openframe-client.zip'; Expand-Archive -Path 'openframe-client.zip' -DestinationPath '.' -Force; Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList '${argString}' -Verb RunAs -Wait`;
    }

    return `cd ~ && rm -f openframe-client_macos.tar.gz openframe-client 2>/dev/null; curl -L -o openframe-client_macos.tar.gz '${macBinaryUrl}' && tar -xzf openframe-client_macos.tar.gz && sudo chmod +x ./openframe-client && sudo ./openframe-client ${baseArgs}${extras}`;
  }, [initialKey, args, platform, selectedOrgId, serverUrl, macBinaryUrl, windowsBinaryUrl]);

  const copyCommand = useCallback(async () => {
    try {
      if (!initialKey) {
        toast({
          title: 'Secret unavailable',
          description: 'Registration secret not loaded yet',
          variant: 'destructive',
        });
        return;
      }
      await navigator.clipboard.writeText(command);
      toast({ title: 'Command copied', description: 'Installer command copied to clipboard', variant: 'default' });
    } catch (_e) {
      toast({ title: 'Copy failed', description: 'Could not copy command', variant: 'destructive' });
    }
  }, [command, toast, initialKey]);

  const runOnCurrentMachine = useCallback(async () => {
    // Detect OS from browser
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    const isWindows = userAgent.includes('win');
    const isLinux = userAgent.includes('linux');

    // Validate platform matches user's actual OS
    if (isMac && platform !== 'darwin') {
      toast({
        title: 'Platform Mismatch',
        description: 'Please select macOS platform for your current machine',
        variant: 'destructive',
      });
      return;
    }

    if (isWindows && platform !== 'windows') {
      toast({
        title: 'Platform Mismatch',
        description: 'Please select Windows platform for your current machine',
        variant: 'destructive',
      });
      return;
    }

    if (isLinux && platform !== 'darwin') {
      // Linux users should use the darwin/bash script (Unix-compatible)
      toast({
        title: 'Platform Mismatch',
        description: 'Please select macOS/Linux platform for your current machine',
        variant: 'destructive',
      });
      return;
    }

    if (!initialKey) {
      toast({ title: 'Secret unavailable', description: 'Registration secret not loaded yet', variant: 'destructive' });
      return;
    }

    // Generate and download a script file for the user to run
    // Use platform state (not browser detection) to match command content
    try {
      let scriptContent: string;
      let fileName: string;
      let mimeType: string;

      if (platform === 'windows') {
        // PowerShell script for Windows
        scriptContent = `# OpenFrame Client Installation Script
# Run this script as Administrator

${command}

Write-Host "OpenFrame client installation complete!" -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
        fileName = 'install-openframe.ps1';
        mimeType = 'application/x-powershell';
      } else {
        // Shell script for macOS
        scriptContent = `#!/bin/bash
# OpenFrame Client Installation Script
# This script requires sudo privileges

${command}

echo ""
echo "OpenFrame client installation complete!"
`;
        fileName = 'install-openframe.sh';
        mimeType = 'application/x-sh';
      }

      // Create and download the script file
      const blob = new Blob([scriptContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Script Downloaded',
        description: isWindows
          ? 'Right-click the file and select "Run with PowerShell" as Administrator'
          : 'Open Terminal, navigate to Downloads, run: chmod +x install-openframe.sh && ./install-openframe.sh',
        variant: 'default',
        duration: 8000,
      });
    } catch (_e) {
      toast({
        title: 'Download failed',
        description: 'Could not generate installation script',
        variant: 'destructive',
      });
    }
  }, [command, platform, toast, initialKey]);

  const copyPath = useCallback(
    async (path: string) => {
      try {
        await navigator.clipboard.writeText(path);
        toast({ title: 'Path copied', description: 'Folder path copied to clipboard', variant: 'default' });
      } catch (_e) {
        toast({ title: 'Copy failed', description: 'Could not copy path', variant: 'destructive' });
      }
    },
    [toast],
  );

  // Get antivirus exclusion paths from unified constants
  const antivirusPaths = useMemo(() => {
    if (platform === 'windows') {
      return OPENFRAME_PATHS.windows;
    } else if (platform === 'darwin') {
      return OPENFRAME_PATHS.darwin;
    }
    return []; // Linux typically doesn't need AV exclusions
  }, [platform]);

  return (
    <AppLayout>
      <DetailPageContainer
        title="New Device"
        backButton={{ label: 'Back to Devices', onClick: () => router.push('/devices') }}
        padding="none"
      >
        <div className="flex flex-col gap-6">
          {/* Top row: Organization and Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Select Organization */}
            <OrganizationSelector
              organizations={orgs}
              value={selectedOrgId}
              onValueChange={setSelectedOrgId}
              label="Select Organization"
              placeholder="Choose organization"
              isLoading={isOrgsLoading}
              searchable
            />
            {/* Select Platform */}
            <OSPlatformSelector
              value={platform}
              onValueChange={setPlatform}
              label="Select Platform"
              className="md:col-span-2"
              options={[
                { platformId: 'windows' },
                { platformId: 'darwin' },
                { platformId: 'linux', disabled: true, badge: { text: 'Coming Soon', colorScheme: 'cyan' } },
              ]}
            />
          </div>

          {/* Additional Arguments - Hidden but not deleted */}
          <div className="hidden flex-col gap-2">
            <div className="text-ods-text-secondary text-sm">Additional Arguments</div>
            <Input
              className="w-full bg-ods-card border border-ods-border rounded-[6px] px-3 py-2 text-ods-text-primary"
              placeholder="Press enter after each argument"
              value={argInput}
              onChange={e => setArgInput(e.target.value)}
              onKeyDown={onArgKeyDown}
            />
            {args.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {args.map((a, idx) => (
                  <div
                    key={`${a}-${idx}`}
                    className="inline-flex items-center gap-2 bg-ods-card border border-ods-border rounded-[999px] px-3 py-1 text-ods-text-primary"
                  >
                    <span className="text-sm">{a}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArg(idx)}
                      aria-label="Remove argument"
                      className="p-0 h-auto text-ods-text-secondary hover:text-ods-text-primary"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Add Command Section */}
          <CommandBox
            title="Device Add Command"
            command={command}
            primaryAction={{
              label: 'Copy Command',
              onClick: copyCommand,
              icon: <Copy className="w-5 h-5" />,
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Run on Current Machine',
              onClick: runOnCurrentMachine,
              icon: <Play className="w-5 h-5" />,
              variant: 'outline',
            }}
          />

          {/* Antivirus Warning Panel */}
          {antivirusPaths.length > 0 && (
            <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col gap-4">
              {/* Warning banner */}
              <div className="bg-[var(--ods-attention-yellow-warning-secondary)] rounded-[6px] p-4 flex gap-4 items-start">
                <AlertTriangle className="w-6 h-6 text-[var(--ods-attention-yellow-warning)] shrink-0" />
                <p className="text-[var(--ods-attention-yellow-warning)] font-bold text-[16px] md:text-[18px]">
                  Your antivirus may block OpenFrame installation. This is a false positive.
                </p>
              </div>

              {/* Folder paths list */}
              <PathsDisplay
                paths={antivirusPaths}
                title="If blocked, add these folders to your antivirus exclusions list:"
                onCopyPath={copyPath}
              />

              {/* Additional note */}
              <p className="text-ods-text-secondary text-[14px] md:text-[16px]">
                Or temporarily disable protection during installation. OpenFrame is safe open-source software. Blocks
                happen because new software needs time to build reputation with security vendors.
              </p>
            </div>
          )}
        </div>
      </DetailPageContainer>
    </AppLayout>
  );
}
