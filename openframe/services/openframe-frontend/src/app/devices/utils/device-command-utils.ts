/**
 * Device Command Utilities
 * Unified logic for building device installation and uninstallation commands
 */

import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils'

const RELEASES_BASE_URL = 'https://github.com/flamingo-stack/openframe-oss-tenant/releases'
const MACOS_BINARY_NAME = 'openframe-client_macos.tar.gz'
const WINDOWS_BINARY_NAME = 'openframe-client_windows.zip'

/**
 * Build the binary download URL for a given version and asset
 */
export function buildBinaryUrl(version: string, assetName: string): string {
  if (!version) {
    return `${RELEASES_BASE_URL}/latest/download/${assetName}`
  }
  return `${RELEASES_BASE_URL}/download/${version}/${assetName}`
}

/**
 * Get macOS binary URL
 */
export function getMacBinaryUrl(version: string): string {
  return buildBinaryUrl(version, MACOS_BINARY_NAME)
}

/**
 * Get Windows binary URL
 */
export function getWindowsBinaryUrl(version: string): string {
  return buildBinaryUrl(version, WINDOWS_BINARY_NAME)
}

export interface InstallCommandOptions {
  platform: OSPlatformId
  serverUrl: string
  initialKey: string
  orgId: string
  releaseVersion: string
  additionalArgs?: string[]
}

/**
 * Build the device installation command
 */
export function buildInstallCommand(options: InstallCommandOptions): string {
  const { platform, serverUrl, initialKey, orgId, releaseVersion, additionalArgs = [] } = options

  const baseArgs = `install --serverUrl ${serverUrl} --initialKey ${initialKey} --orgId ${orgId}`
  const extras = additionalArgs.length ? ' ' + additionalArgs.join(' ') : ''

  if (platform === 'windows') {
    const windowsBinaryUrl = getWindowsBinaryUrl(releaseVersion)
    const argString = `${baseArgs}${extras}`
    return `Set-Location ~; Remove-Item -Path 'openframe-client.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri '${windowsBinaryUrl}' -OutFile 'openframe-client.zip'; Expand-Archive -Path 'openframe-client.zip' -DestinationPath '.' -Force; Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList '${argString}' -Verb RunAs -Wait`
  }

  // macOS / darwin
  const macBinaryUrl = getMacBinaryUrl(releaseVersion)
  return `cd ~ && rm -f openframe-client_macos.tar.gz openframe-client 2>/dev/null; curl -L -o openframe-client_macos.tar.gz '${macBinaryUrl}' && tar -xzf openframe-client_macos.tar.gz && sudo chmod +x ./openframe-client && sudo ./openframe-client ${baseArgs}${extras}`
}

export interface UninstallCommandOptions {
  platform: OSPlatformId
  releaseVersion: string
}

/**
 * Build the device uninstallation command
 */
export function buildUninstallCommand(options: UninstallCommandOptions): string {
  const { platform, releaseVersion } = options

  if (platform === 'windows') {
    const windowsBinaryUrl = getWindowsBinaryUrl(releaseVersion)
    return `Set-Location ~; Remove-Item -Path 'openframe-client.zip','openframe-client.exe' -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri '${windowsBinaryUrl}' -OutFile 'openframe-client.zip'; Expand-Archive -Path 'openframe-client.zip' -DestinationPath '.' -Force; Start-Process -FilePath '.\\openframe-client.exe' -ArgumentList 'uninstall' -Verb RunAs -Wait`
  }

  // macOS / darwin
  const macBinaryUrl = getMacBinaryUrl(releaseVersion)
  return `cd ~ && rm -f openframe-client_macos.tar.gz openframe-client 2>/dev/null; curl -L -o openframe-client_macos.tar.gz '${macBinaryUrl}' && tar -xzf openframe-client_macos.tar.gz && sudo chmod +x ./openframe-client && sudo ./openframe-client uninstall`
}

/**
 * Normalize OS type from various device fields to OSPlatformId
 */
export function normalizeDevicePlatform(
  platform?: string,
  osType?: string,
  operatingSystem?: string
): OSPlatformId {
  const osValue = (platform || osType || operatingSystem || '').toLowerCase()

  if (osValue.includes('windows') || osValue === 'win' || osValue === 'win32' || osValue === 'win64') {
    return 'windows'
  }

  if (osValue.includes('darwin') || osValue.includes('mac') || osValue.includes('osx')) {
    return 'darwin'
  }

  if (
    osValue.includes('linux') ||
    osValue.includes('ubuntu') ||
    osValue.includes('debian') ||
    osValue.includes('centos') ||
    osValue.includes('redhat') ||
    osValue.includes('fedora')
  ) {
    return 'linux'
  }

  // Default to darwin if unknown
  return 'darwin'
}
