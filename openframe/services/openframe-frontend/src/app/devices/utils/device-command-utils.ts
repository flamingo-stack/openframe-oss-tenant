/**
 * Device Command Utilities
 * Unified logic for building device installation and uninstallation commands
 *
 * Commands fetch the release version at runtime via the /clients/api/release-version endpoint
 * using the X-Initial-Key header, then download the matching binary from GitHub releases.
 */

import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';

const RELEASES_BASE_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases';
const MACOS_BINARY_NAME = 'openframe-client_macos.tar.gz';
const WINDOWS_BINARY_NAME = 'openframe-client_windows.zip';

function buildMacCommand(versionUrl: string, initialKey: string, action: string): string {
  return [
    `cd ~ && rm -f ${MACOS_BINARY_NAME} openframe-client; \\`,
    `VERSION=$(curl -sf -H "X-Initial-Key: ${initialKey}" ${versionUrl}) && \\`,
    '[ -n "$VERSION" ] && \\',
    'echo "Downloading version: $VERSION" && \\',
    `curl -fL -o ${MACOS_BINARY_NAME} "${RELEASES_BASE_URL}/download/\${VERSION}/${MACOS_BINARY_NAME}" && \\`,
    `tar -xzf ${MACOS_BINARY_NAME} && \\`,
    'sudo chmod +x ./openframe-client && \\',
    `sudo ./openframe-client ${action}`,
  ].join('\n');
}

function buildWindowsCommand(versionUrl: string, initialKey: string, action: string): string {
  return [
    '$ErrorActionPreference = "Stop"',
    'Set-Location ~',
    "Remove-Item -Path 'openframe-client_windows.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue",
    `$VERSION = (Invoke-WebRequest -Uri '${versionUrl}' -Headers @{"X-Initial-Key"="${initialKey}"}).Content.Trim()`,
    'if (-not $VERSION) { throw "Failed to fetch release version" }',
    'Write-Host "Downloading version: $VERSION"',
    `Invoke-WebRequest -Uri '${RELEASES_BASE_URL}/download/$VERSION/${WINDOWS_BINARY_NAME}' -OutFile 'openframe-client_windows.zip'`,
    "Expand-Archive -Path 'openframe-client_windows.zip' -DestinationPath '.' -Force",
    `Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList '${action}' -Verb RunAs -Wait`,
  ].join('; ');
}

function buildCommand(platform: OSPlatformId, serverBaseUrl: string, initialKey: string, action: string): string {
  const versionUrl = `${serverBaseUrl}/clients/api/release-version`;
  if (platform === 'windows') {
    return buildWindowsCommand(versionUrl, initialKey, action);
  }
  return buildMacCommand(versionUrl, initialKey, action);
}

export interface InstallCommandOptions {
  platform: OSPlatformId;
  serverUrl: string;
  serverBaseUrl: string;
  initialKey: string;
  orgId: string;
  additionalArgs?: string[];
}

/**
 * Build the device installation command
 */
export function buildInstallCommand(options: InstallCommandOptions): string {
  const { platform, serverUrl, serverBaseUrl, initialKey, orgId, additionalArgs = [] } = options;
  const extras = additionalArgs.length ? ' ' + additionalArgs.join(' ') : '';
  const action = `install --serverUrl ${serverUrl} --initialKey ${initialKey} --orgId ${orgId}${extras}`;
  return buildCommand(platform, serverBaseUrl, initialKey, action);
}

export interface UninstallCommandOptions {
  platform: OSPlatformId;
  serverBaseUrl: string;
  initialKey: string;
}

/**
 * Build the device uninstallation command
 */
export function buildUninstallCommand(options: UninstallCommandOptions): string {
  const { platform, serverBaseUrl, initialKey } = options;
  return buildCommand(platform, serverBaseUrl, initialKey, 'uninstall');
}

/**
 * Normalize OS type from various device fields to OSPlatformId
 */
export function normalizeDevicePlatform(platform?: string, osType?: string, operatingSystem?: string): OSPlatformId {
  const osValue = (platform || osType || operatingSystem || '').toLowerCase();

  if (osValue.includes('windows') || osValue === 'win' || osValue === 'win32' || osValue === 'win64') {
    return 'windows';
  }

  if (osValue.includes('darwin') || osValue.includes('mac') || osValue.includes('osx')) {
    return 'darwin';
  }

  if (
    osValue.includes('linux') ||
    osValue.includes('ubuntu') ||
    osValue.includes('debian') ||
    osValue.includes('centos') ||
    osValue.includes('redhat') ||
    osValue.includes('fedora')
  ) {
    return 'linux';
  }

  // Default to darwin if unknown
  return 'darwin';
}
